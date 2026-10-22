"""Runs against the DATABASE_URL database with migrations applied (use a throwaway DB, see docs/CONTRACTS.md)."""
from datetime import date, datetime
from decimal import Decimal

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from nepse.config import get_settings
from nepse.domain.calendar.npt import NPT
from nepse.domain.market.entities import DailyBar, FloorsheetTick, IndexBar, ListedCompany
from nepse.infrastructure.db.repositories.ingestion import SqlIngestionRepository

DAY = date(2020, 1, 5)  # far from real data so the test never collides with ingested rows


@pytest.fixture
async def repo():
    engine = create_async_engine(get_settings().database_url)
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1 FROM floorsheet_ticks LIMIT 1"))
    except Exception as exc:
        await engine.dispose()
        pytest.skip(f"no migrated database: {exc}")
    yield SqlIngestionRepository(engine)
    async with engine.begin() as conn:
        await conn.execute(text("DELETE FROM floorsheet_ticks WHERE trade_time < '2020-02-01'"))
        await conn.execute(text("DELETE FROM ohlcv_daily WHERE trade_date = :d"), {"d": DAY})
        await conn.execute(text("DELETE FROM index_daily WHERE trade_date = :d"), {"d": DAY})
        await conn.execute(text("DELETE FROM companies WHERE symbol LIKE 'ZZT%'"))
    await SqlIngestionRepository(engine).refresh_broker_aggregates(DAY, DAY)  # drop materialized test rows
    await engine.dispose()


def tick(contract: int, buyer: int, seller: int, qty: int) -> FloorsheetTick:
    return FloorsheetTick(contract, "ZZTA", buyer, seller, qty, Decimal("100"), Decimal(100 * qty),
                          datetime(2020, 1, 5, 11, 0, tzinfo=NPT), f"Broker {buyer}", f"Broker {seller}")


async def test_full_eod_cycle_is_idempotent(repo):
    companies = [ListedCompany("ZZTA", "Test A", "HYDRO", "EQUITY", "A", 999001),
                 ListedCompany("ZZTB", "Test B", None, "MUTUAL_FUND", "S", None)]
    assert await repo.upsert_companies(companies) == 2
    assert await repo.upsert_companies(companies) == 2  # update path

    p = Decimal("100")
    bars = [DailyBar("ZZTA", DAY, p, p, p, p, p, 10, p * 10, 1), DailyBar("NOPE", DAY, p, p, p, p, p, 1, p, 1)]
    assert await repo.upsert_daily_bars(bars) == (1, {"NOPE"})
    assert await repo.upsert_index_bars([IndexBar("HYDRO", DAY, p, p, p, p, None)]) == 1

    ticks = [tick(9_000_001, 1, 2, 10), tick(9_000_002, 1, 1, 5), tick(9_000_003, 3, 2, 20)]
    await repo.upsert_brokers({1: "Broker 1", 2: "Broker 2", 3: "Broker 3"})
    assert await repo.insert_floorsheet(ticks) == (3, set())
    assert await repo.insert_floorsheet(ticks) == (0, set())

    await repo.refresh_broker_aggregates(DAY, DAY)
    async with repo._engine.connect() as conn:
        rows = (await conn.execute(text(
            "SELECT broker, buy_qty, sell_qty, self_trade_qty FROM broker_daily d "
            "JOIN companies c ON c.id = d.company_id WHERE c.symbol = 'ZZTA' ORDER BY broker"
        ))).all()
    assert [tuple(r) for r in rows] == [(1, 15, 5, 5), (2, 0, 30, 0), (3, 20, 0, 0)]
