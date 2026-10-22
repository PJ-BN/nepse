"""Runs against the migrated test database named by DATABASE_URL (docs/CONTRACTS.md: nepse_fundamentals)."""
import os
from datetime import date

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from nepse.application.fundamentals.ports import DividendRecord, QuarterRow
from nepse.infrastructure.db.repositories.fundamentals import SqlFundamentalsRepository

pytestmark = pytest.mark.skipif("DATABASE_URL" not in os.environ, reason="needs the migrated test database")
SYM = "ZZFUNDTEST"


@pytest.fixture
async def repo():
    engine = create_async_engine(os.environ["DATABASE_URL"])
    cleanup = [f"DELETE FROM {t} WHERE company_id IN (SELECT id FROM companies WHERE symbol = '{SYM}')"
               for t in ("quarterly_financials", "dividends", "mutual_fund_nav", "ohlcv_daily")]
    cleanup.append(f"DELETE FROM companies WHERE symbol = '{SYM}'")

    async def wipe():
        async with engine.begin() as conn:
            for stmt in cleanup:
                await conn.execute(text(stmt))

    await wipe()
    async with async_sessionmaker(engine, expire_on_commit=False)() as session:
        yield SqlFundamentalsRepository(session)
    await wipe()
    await engine.dispose()


async def test_round_trip(repo):
    c = await repo.create_company(SYM, "Fund Test Ltd", "HYDRO")
    assert c.sector_code == "HYDRO" and c.instrument_type == "EQUITY"
    await repo.update_company_shares(c.id, listed=1_000_000.0, promoter=510_000, public=490_000, paid_up_capital=1e8)
    c = await repo.company(SYM)
    assert (c.listed_shares, c.promoter_shares, c.paid_up_capital) == (1_000_000, 510_000, 1e8)

    q = QuarterRow(fy_bs="2082/83", quarter=4, period_end=date(2026, 7, 16), eps=12.5, bvps=150.0,
                   sector_metrics={"installed_capacity_mw": 20.0})
    await repo.upsert_quarter(c.id, q)
    await repo.upsert_quarter(c.id, QuarterRow(fy_bs="2082/83", quarter=4, period_end=date(2026, 7, 16), eps=13.0))
    await repo.upsert_quarter(c.id, QuarterRow(fy_bs="2082/83", quarter=3, period_end=date(2026, 4, 13), eps=9.0))
    rows = await repo.quarters(c.id, 20)
    assert [(r.quarter, r.eps) for r in rows] == [(4, 13.0), (3, 9.0)]
    assert rows[0].bvps == 150.0 and rows[0].sector_metrics == {"installed_capacity_mw": 20.0}  # kept by COALESCE

    divs = [DividendRecord("2081/82", 10, 5), DividendRecord("2081/82", 0, 0),
            DividendRecord("2082/83", 5, 0, book_closure_date=date(2026, 9, 30))]
    assert await repo.upsert_dividends(c.id, divs) == 2  # duplicate FY without book closure collapses
    assert await repo.upsert_dividends(c.id, divs) == 2  # idempotent
    stored = await repo.dividends(c.id)
    assert [(d.fy_bs, d.bonus_pct) for d in stored] == [("2082/83", 5.0), ("2081/82", 10.0)]

    assert await repo.latest_price(c.id) is None
    async with repo.s.bind.begin() as conn:
        await conn.execute(text(
            "INSERT INTO ohlcv_daily (company_id, trade_date, high, low, close) VALUES "
            f"({c.id}, '2025-01-01', 900, 100, 500), ({c.id}, '2026-01-05', 420, 380, 400), "
            f"({c.id}, '2026-10-16', 450, 390, 410)"))
        await conn.execute(text(f"INSERT INTO mutual_fund_nav VALUES ({c.id}, '2026-10-17', 10.5, NULL)"))
    p = await repo.latest_price(c.id)
    assert (p.close, p.trade_date, p.high_52w, p.low_52w) == (410.0, date(2026, 10, 16), 450.0, 380.0)
    nav = await repo.latest_nav(c.id)
    assert nav.weekly_nav == 10.5 and nav.monthly_nav is None
