"""Repository tests against a real TimescaleDB (the branch's own nepse_screener database, see docs/CONTRACTS.md).

Seeds synthetic OHLCV and floorsheet ticks, refreshes the broker aggregates and mv_screener_snapshot, then checks
the SQL indicators against the pure-Python domain functions and runs injection attempts end to end.
"""
import math
import os
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import pytest
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from nepse.application.macro.ports import CD_RATIO, IssueRow, Observation
from nepse.application.screener.filter_ast import FilterError, parse_filter, parse_sort
from nepse.application.screener.run_screener import run_preset, run_screener
from nepse.domain.technicals.indicators import atr_pct, rsi, sma
from nepse.infrastructure.db.repositories.macro import SqlMacroRepository
from nepse.infrastructure.db.repositories.screener import SqlScreenerRepository, build_query

DB_URL = os.environ.get("DATABASE_URL", "")
# This module TRUNCATEs tables: never let it near the main `nepse` database.
pytestmark = pytest.mark.skipif(
    not DB_URL.startswith("postgresql") or make_url(DB_URL).database in (None, "nepse"),
    reason="needs DATABASE_URL pointing at a throwaway database (e.g. nepse_screener)",
)

NPT = ZoneInfo("Asia/Kathmandu")
LAST = date(2026, 10, 15)
N_BARS = 260


def _sessions(n: int) -> list[date]:
    out, d = [], LAST
    while len(out) < n:
        if d.weekday() not in (4, 5):  # NEPSE trades Sunday-Thursday
            out.append(d)
        d -= timedelta(days=1)
    return out[::-1]


DAYS = _sessions(N_BARS)


def _aaa_close(i: int) -> float:
    return round(100 + 10 * math.sin(i / 7) + i * 0.2, 2)


async def _seed(engine) -> None:
    async with engine.begin() as conn:
        await conn.execute(sa.text(
            "TRUNCATE floorsheet_ticks, ohlcv_daily, index_daily, macro_indicators, ipo_pipeline, companies "
            "RESTART IDENTITY CASCADE"))
        sector = {code: sid for sid, code in await conn.execute(sa.text("SELECT id, code FROM sectors"))}
        await conn.execute(sa.text(
            "INSERT INTO companies (id, symbol, name, sector_id, instrument_type, listed_shares, status) VALUES "
            "(1, 'AAA', 'Alpha Bank', :bank, 'EQUITY', 10000000, 'ACTIVE'),"
            "(2, 'HHH', 'Hydro Small', :hydro, 'EQUITY', 1000000, 'ACTIVE'),"
            "(3, 'DDD', 'Debenture', :bank, 'DEBENTURE', 1000, 'ACTIVE'),"
            "(4, 'III', 'Delisted', :bank, 'EQUITY', 1000, 'DELISTED'),"
            "(5, 'NNN', 'No Bars', :hydro, 'EQUITY', 1000, 'ACTIVE'),"
            "(6, 'PPP', 'Promoter', :bank, 'PROMOTER', 1000, 'ACTIVE')"), {"bank": sector["BANKING"], "hydro": sector["HYDRO"]})
        # Explicit ids don't advance the sequence; without this the next plain INSERT (other suites) hits id=1.
        await conn.execute(sa.text("SELECT setval('companies_id_seq', (SELECT max(id) FROM companies))"))
        bars = []
        for i, d in enumerate(DAYS):
            # AAA had a 1:1 bonus at bar 100: older raw prices are double, adj_factor 0.5 restores continuity
            factor = 0.5 if i < 100 else 1.0
            c = _aaa_close(i)
            prev = _aaa_close(i - 1) if i else None
            bars.append({"cid": 1, "d": d, "o": c / factor, "h": (c + 1) / factor, "l": (c - 1) / factor,
                         "c": c / factor, "p": None if prev is None else prev / (0.5 if i - 1 < 100 else 1.0),
                         "v": 1000 + i, "t": c * 1000, "f": factor})
            hc = 300 - i * 0.5
            bars.append({"cid": 2, "d": d, "o": hc, "h": hc + 2, "l": hc - 2, "c": hc, "p": hc + 0.5,
                         "v": 500, "t": hc * 500, "f": 1.0})
            for cid in (3, 6):  # debenture and promoter listings trade too, but stay out of the universe
                bars.append({"cid": cid, "d": d, "o": 1000, "h": 1000, "l": 1000, "c": 1000, "p": 1000,
                             "v": 1, "t": 1000, "f": 1.0})
        await conn.execute(sa.text(
            "INSERT INTO ohlcv_daily (company_id, trade_date, open, high, low, close, prev_close, volume, turnover,"
            " adj_factor) VALUES (:cid, :d, :o, :h, :l, :c, :p, :v, :t, :f)"), bars)

        # HHH floorsheet: in the last 15 sessions broker 1 nets +600, 2 +300, 3 +100, 4 self-trades 1000,
        # 9 and 8 sell. Top-3 net buy 1000 of 2000 bought = 50%. A big buy 30 sessions back is outside the window.
        ticks, n = [], 0
        def tick(day, buyer, seller, qty):
            nonlocal n
            n += 1
            ticks.append({"no": n, "ts": datetime.combine(day, time(12), NPT), "b": buyer, "s": seller, "q": qty})
        for day in DAYS[-15:-12]:
            tick(day, 1, 9, 200)
            tick(day, 2, 9, 100)
        tick(DAYS[-1], 3, 8, 100)
        tick(DAYS[-2], 4, 4, 1000)
        tick(DAYS[-30], 5, 9, 5000)
        await conn.execute(sa.text(
            "INSERT INTO floorsheet_ticks (contract_no, trade_time, company_id, buyer_broker, seller_broker, qty,"
            " rate, amount) VALUES (:no, :ts, 2, :b, :s, :q, 100, :q * 100)"), ticks)

        await conn.execute(sa.text(
            "INSERT INTO index_daily (index_code, trade_date, close) VALUES "
            "('NEPSE', '2026-10-14', 2600), ('NEPSE', '2026-10-15', 2610), ('HYDRO', '2026-10-15', 3000)"))
    async with engine.connect() as conn:  # continuous aggregates refresh outside a transaction
        conn = await conn.execution_options(isolation_level="AUTOCOMMIT")
        for cagg in ("broker_buy_daily", "broker_sell_daily"):
            await conn.execute(sa.text(f"CALL refresh_continuous_aggregate('{cagg}', NULL, NULL)"))


@pytest.fixture
async def session():
    engine = create_async_engine(DB_URL, poolclass=NullPool)
    await _seed(engine)
    async with AsyncSession(engine, expire_on_commit=False) as s:
        await SqlScreenerRepository(s).refresh()
        yield s
    await engine.dispose()


async def test_snapshot_matches_domain_indicators(session):
    repo = SqlScreenerRepository(session)
    rows = {r["symbol"]: r for r in await repo.query(None, parse_sort(None), 100)}
    assert set(rows) == {"AAA", "HHH", "NNN"}  # debenture, promoter and delisted excluded; no-bar company kept

    adj = [_aaa_close(i) for i in range(N_BARS)]
    a = rows["AAA"]
    assert a["trade_date"] == LAST and a["sector"] == "BANKING"
    assert a["close"] == pytest.approx(adj[-1])
    assert a["change_pct"] == pytest.approx(100 * (adj[-1] - adj[-2]) / adj[-2], abs=1e-6)
    assert a["sma_20"] == pytest.approx(sma(adj, 20)[-1])
    assert a["sma_50"] == pytest.approx(sma(adj, 50)[-1])
    assert a["sma_200"] == pytest.approx(sma(adj, 200)[-1])  # spans the bonus adjustment
    assert a["rsi_14"] == pytest.approx(rsi(adj, wilder=False)[-1])
    highs, lows = [c + 1 for c in adj], [c - 1 for c in adj]
    assert a["atr_pct"] == pytest.approx(atr_pct(highs, lows, adj, wilder=False)[-1])
    in_year = [i for i, d in enumerate(DAYS) if d >= LAST - timedelta(days=365)]
    assert a["high_52w"] == pytest.approx(max(highs[i] for i in in_year))
    assert a["low_52w"] == pytest.approx(min(lows[i] for i in in_year))
    assert a["market_cap"] == pytest.approx(adj[-1] * 10_000_000)
    assert a["volume"] == 1000 + N_BARS - 1
    assert a["top3_broker_accum_15d_pct"] is None  # no floorsheet

    h = rows["HHH"]
    assert h["top3_broker_accum_15d_pct"] == pytest.approx(50.0)
    assert h["rsi_14"] == pytest.approx(0.0)  # falls every day
    assert rows["NNN"]["close"] is None and rows["NNN"]["sma_200"] is None


async def test_filters_sort_and_presets(session):
    repo = SqlScreenerRepository(session)
    got = await run_screener(repo, {"field": "close", "op": ">", "value": {"field": "sma_200"}}, ["symbol"], 10)
    assert [r["symbol"] for r in got] == ["AAA"]
    got = await run_screener(repo, {"or": [
        {"field": "sector", "op": "in", "value": ["HYDRO"]},
        {"field": "volume", "op": "between", "value": [1258.5, 1260]},  # float bounds on a BIGINT column
    ]}, ["-symbol"], 10)
    assert [r["symbol"] for r in got] == ["NNN", "HHH", "AAA"]
    got = await run_screener(repo, {"field": "rsi_14", "op": "!=", "value": 0}, ["-rsi_14"], 1)
    assert [r["symbol"] for r in got] == ["AAA"]
    hydro = await run_preset(repo, "broker-cornered-low-cap-hydro")
    assert [r["symbol"] for r in hydro] == ["HHH"]
    for preset in ("undervalued-banks", "rsi-oversold-above-sma200"):
        await run_preset(repo, preset)


INJECTIONS = [
    "BANKING' OR '1'='1",
    "'; DROP TABLE companies; --",
    "x\\'; SELECT pg_sleep(5); --",
    "$1",
    "%(sector)s",
]


@pytest.mark.parametrize("payload", INJECTIONS)
async def test_injection_through_values_is_inert(session, payload):
    repo = SqlScreenerRepository(session)
    for raw in ({"field": "sector", "op": "=", "value": payload},
                {"field": "symbol", "op": "in", "value": [payload, "AAA' --"]}):
        node = parse_filter(raw)
        sql = str(build_query(node, parse_sort(None), 10).compile(dialect=postgresql.dialect()))
        assert payload not in sql and "DROP" not in sql
        assert await repo.query(node, parse_sort(None), 10) == []
    assert await session.scalar(sa.text("SELECT count(*) FROM companies")) == 6


@pytest.mark.parametrize("raw", [
    {"field": "sector\" OR 1=1 --", "op": "=", "value": "x"},
    {"field": "close", "op": "= 0 OR 1=1 --", "value": 1},
    {"field": "close", "op": ">", "value": {"field": "(SELECT 1)"}},
])
async def test_injection_through_fields_and_ops_never_reaches_sql(session, raw):
    with pytest.raises(FilterError):
        await run_screener(SqlScreenerRepository(session), raw)
    with pytest.raises(FilterError):
        await run_screener(SqlScreenerRepository(session), None, ["close; DROP TABLE companies"])


async def test_breadth_closes_are_adjusted(session):
    closes = await SqlScreenerRepository(session).adjusted_closes(400)
    assert set(closes) == {"AAA", "HHH"}  # same universe as the snapshot: no debenture/promoter listings
    assert [c for _, c in closes["AAA"]][98:102] == pytest.approx([_aaa_close(i) for i in range(98, 102)])


async def test_macro_repository(session):
    repo = SqlMacroRepository(session)
    obs = [Observation(CD_RATIO, date(2026, 10, 10), 70.84, "nrb_home"),
           Observation(CD_RATIO, date(2026, 10, 11), 70.0, "nrb_home")]
    assert await repo.upsert_observations(obs) == 2
    assert await repo.upsert_observations([  # update, with a duplicate key inside one batch
        Observation(CD_RATIO, date(2026, 10, 11), 1.0, "nrb_home"),
        Observation(CD_RATIO, date(2026, 10, 11), 70.79, "nrb_home"),
    ]) == 1
    series = await repo.series((CD_RATIO, "interbank_rate"), date(2026, 1, 1))
    assert series == {CD_RATIO: [(date(2026, 10, 10), 70.84), (date(2026, 10, 11), 70.79)]}

    idx = await repo.index_closes(("NEPSE", "HYDRO"), date(2026, 10, 15))
    assert idx == {"HYDRO": [(date(2026, 10, 15), 3000.0)], "NEPSE": [(date(2026, 10, 15), 2610.0)]}

    rows = [IssueRow("Apex Hospitality Limited", "IPO", "PIPELINE", units=1.0, application_date_bs="2080/06/12"),
            IssueRow("Apex Hospitality Limited", "IPO", "PIPELINE", units=2.0, application_date_bs="2080/06/12"),
            IssueRow("Him Parbat Hydropower Limited", "IPO", "APPROVED", approval_date_bs="2082/06/20")]
    assert await repo.upsert_issues(rows) == 2
    await repo.upsert_issues([IssueRow("Apex Hospitality Limited", "IPO", "PIPELINE", units=3.0)])
    issues = {(r.company, r.stage): r for r in await repo.issues()}
    assert issues[("Apex Hospitality Limited", "PIPELINE")].units == 3.0
    assert issues[("Him Parbat Hydropower Limited", "APPROVED")].approval_date_bs == "2082/06/20"


async def test_api_endpoints(session):
    import httpx

    from nepse.main import app

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
        r = await c.post("/api/v1/screener/run", json={"preset": "broker-cornered-low-cap-hydro"})
        assert r.status_code == 200 and [row["symbol"] for row in r.json()["rows"]] == ["HHH"]
        r = await c.post("/api/v1/screener/run", json={
            "filter": {"field": "close", "op": ">", "value": {"field": "sma_200"}}, "format": "csv"})
        assert r.headers["content-type"].startswith("text/csv")
        assert r.text.splitlines()[1].startswith("AAA,BANKING,2026-10-15,")
        r = await c.post("/api/v1/screener/run", json={"filter": {"field": "close;--", "op": ">", "value": 1}})
        assert r.status_code == 422 and "unknown field" in r.json()["detail"]
        assert (await c.post("/api/v1/screener/run", json={"preset": "nope"})).status_code == 404
        assert len((await c.get("/api/v1/screener/presets")).json()) == 3
        b = (await c.get("/api/v1/breadth")).json()
        assert b["as_of"] == "2026-10-15" and b["advances"] + b["declines"] + b["unchanged"] == 2  # AAA, HHH
        assert (await c.get("/api/v1/macro/radar")).status_code == 200
        assert (await c.get("/api/v1/macro/rrg?timeframe=weekly")).json()["timeframe"] == "weekly"
        assert (await c.get("/api/v1/macro/rrg?timeframe=hourly")).status_code == 422
        assert (await c.get("/api/v1/macro/ipo-pipeline")).json() == []


async def test_fundamentals_columns_from_latest_quarter(session):
    # Two quarters for AAA: only the latest (by period_end) may feed the snapshot.
    await session.execute(sa.text(
        "INSERT INTO quarterly_financials (company_id, fy_bs, quarter, period_end, eps, bvps, sector_metrics) VALUES "
        "(1, '2081/82', 4, '2025-07-16', 99, 999, '{\"npl_pct\": 9}'),"
        "(1, '2082/83', 1, '2025-10-17', 10, 100, '{\"npl_pct\": 2.5, \"car_pct\": \"n/a\"}')"))
    await session.commit()
    repo = SqlScreenerRepository(session)
    await repo.refresh()
    rows = {r["symbol"]: r for r in await repo.query(None, parse_sort(None), 100)}
    a, close = rows["AAA"], rows["AAA"]["close"]
    assert (a["eps"], a["bvps"]) == (10, 100)
    assert a["pe"] == pytest.approx(close / 10) and a["pbv"] == pytest.approx(close / 100)
    assert a["graham_number"] == pytest.approx(150.0)  # sqrt(22.5 * 10 * 100)
    assert a["npl_pct"] == 2.5 and a["car_pct"] is None  # non-numeric JSONB value is ignored, not an error
    assert rows["HHH"]["pe"] is None  # no financials

    hits = await run_screener(repo, {"and": [{"field": "pbv", "op": "<", "value": 5},
                                             {"field": "npl_pct", "op": "<", "value": 4.5}]})
    assert [r["symbol"] for r in hits] == ["AAA"]
