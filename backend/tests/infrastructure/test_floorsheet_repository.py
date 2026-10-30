"""Integration: synthetic ticks -> continuous aggregates -> broker matrix. Needs the DB from DATABASE_URL."""
import os

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from nepse.application.floorsheet.analytics import (
    get_broker_analytics, get_broker_profile, latest_whales, scan_accumulation,
)
from nepse.infrastructure.db.repositories.floorsheet import SqlFloorsheetRepository

# pytest-asyncio is missing from the image; anyio ships its own pytest plugin.
pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend():
    return "asyncio"


SYMBOL = "ITESTFS"

SEED = [
    f"INSERT INTO companies (symbol, name, sector_id, public_shares) VALUES ('{SYMBOL}', 'Integration', 7, 1000000) "
    "ON CONFLICT (symbol) DO NOTHING",
    f"DELETE FROM floorsheet_ticks WHERE company_id = (SELECT id FROM companies WHERE symbol = '{SYMBOL}')",
    # 3 trading days x 2000 trades, 10:45 NPT onwards, 20 brokers, some self-trades, one guaranteed whale.
    f"""INSERT INTO floorsheet_ticks (trade_time, contract_no, company_id, buyer_broker, seller_broker, qty, rate, amount)
    SELECT (SELECT COALESCE(max(trade_time), now()) FROM floorsheet_ticks) - (g / 2000) * INTERVAL '1 day' + (g % 2000) * INTERVAL '1 millisecond',
           900000000 + g, (SELECT id FROM companies WHERE symbol = '{SYMBOL}'),
           b, CASE WHEN g % 50 = 0 THEN b ELSE s END, q, 200, q * 200
    FROM (SELECT g, 1 + (g * 7) % 20 AS b, 1 + (g * 13) % 20 AS s, CASE WHEN g = 1 THEN 6000 ELSE 10 + g % 90 END AS q
          FROM generate_series(0, 5999) g) x""",
    "CALL refresh_continuous_aggregate('broker_buy_daily', NULL, NULL)",
    "CALL refresh_continuous_aggregate('broker_sell_daily', NULL, NULL)",
]


@pytest.fixture
async def engine():
    if not os.environ.get("DATABASE_URL"):
        pytest.skip("DATABASE_URL not set")
    eng = create_async_engine(os.environ["DATABASE_URL"], poolclass=NullPool)
    async with eng.connect() as conn:
        conn = await conn.execution_options(isolation_level="AUTOCOMMIT")  # aggregate refresh refuses a txn
        for stmt in SEED:
            await conn.execute(text(stmt))
    yield eng
    await eng.dispose()


async def test_matrix_totals_match_traded_volume(engine):
    async with AsyncSession(engine) as s:
        repo = SqlFloorsheetRepository(s)
        traded = await s.scalar(text(
            "SELECT sum(qty) FROM floorsheet_ticks WHERE company_id = (SELECT id FROM companies WHERE symbol = :s)"
        ), {"s": SYMBOL})
        a = await get_broker_analytics(repo, SYMBOL.lower(), days=90)
        assert a.total_volume == traded
        assert sum(r.buy_qty for r in a.rows) == sum(r.sell_qty for r in a.rows) == traded
        assert sum(r.net for r in a.rows) == 0
        assert a.ltp == 200 and a.sankey and all(link.buyer != link.seller for link in a.sankey)

        washed = await get_broker_analytics(repo, SYMBOL, days=90, exclude_wash=True)
        assert 0 < washed.total_volume < traded
        assert {r.broker: r.net for r in washed.rows} == {r.broker: r.net for r in a.rows}

        one_day = await get_broker_analytics(repo, SYMBOL, days=1)
        assert 0 < one_day.total_volume < traded

        profile = await get_broker_profile(repo, a.rows[0].broker)
        assert len(profile.windows) >= 3
        assert profile.broker == a.rows[0].broker
        assert isinstance(await scan_accumulation(repo), list)  # no ohlcv_daily seeded -> ATR unknown
        whales = await latest_whales(repo, SYMBOL)
        assert [w["qty"] for w in whales] == [6000]
