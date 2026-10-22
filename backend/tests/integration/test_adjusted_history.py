"""Seeds one company with a 10% bonus and checks that adjusted history removes the book-closure gap.

Needs the database from DATABASE_URL with migration 0001 applied; skipped when it is unreachable.
"""
from datetime import date

import httpx
import pytest
from sqlalchemy import text

from nepse.application.charting.get_history import to_unix
from nepse.application.charting.recompute_adjustments import recompute_adjustments
from nepse.infrastructure.db.repositories.charting import SqlAdjustmentRepository
from nepse.infrastructure.db.session import SessionLocal, engine
from nepse.main import app

SYMBOL = "ZZADJTEST"
BOOK_CLOSURE = date(2025, 1, 5)
CLOSES = {date(2025, 1, 1): 436, date(2025, 1, 2): 440, BOOK_CLOSURE: 400, date(2025, 1, 6): 404}


async def _cleanup(s) -> None:
    sub = "(SELECT id FROM companies WHERE symbol = :sym)"
    for table in ("ohlcv_daily", "corporate_actions"):
        await s.execute(text(f"DELETE FROM {table} WHERE company_id IN {sub}"), {"sym": SYMBOL})
    await s.execute(text("DELETE FROM companies WHERE symbol = :sym"), {"sym": SYMBOL})
    await s.commit()


async def test_adjusted_history_removes_bonus_gap():
    try:
        async with engine.connect():
            pass
    except Exception as exc:
        pytest.skip(f"database unavailable: {exc}")
    try:
        async with SessionLocal() as s:
            await _cleanup(s)
            cid = await s.scalar(text("INSERT INTO companies (symbol, name) VALUES (:sym, 'Adjustment Test')"
                                      " RETURNING id"), {"sym": SYMBOL})
            for d, c in CLOSES.items():
                await s.execute(text("""INSERT INTO ohlcv_daily (trade_date, company_id, open, high, low, close, volume)
                                        VALUES (:d, :cid, :c, :c, :c, :c, 1100)"""), {"d": d, "cid": cid, "c": c})
            await s.execute(text("INSERT INTO corporate_actions (company_id, bonus_pct, book_closure_date)"
                                 " VALUES (:cid, 10, :d)"), {"cid": cid, "d": BOOK_CLOSURE})
            await s.commit()
            assert await recompute_adjustments(SqlAdjustmentRepository(s), cid) == 4

        params = {"symbol": SYMBOL, "from": to_unix(date(2025, 1, 1)), "to": to_unix(date(2025, 1, 31))}
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as client:
            raw = (await client.get("/api/v1/udf/history", params={**params, "adjusted": "false"})).json()
            adj = (await client.get("/api/v1/udf/history", params=params)).json()

        assert raw["c"] == [436, 440, 400, 404]
        assert raw["c"][2] / raw["c"][1] - 1 == pytest.approx(-0.0909, abs=1e-4)  # the bonus gap
        assert adj["c"] == [396.36, 400, 400, 404]  # 440 / 1.1 = 400: gap gone
        assert adj["v"] == [1210, 1210, 1100, 1100]
    finally:
        async with SessionLocal() as s:
            await _cleanup(s)
        await engine.dispose()  # the pool is bound to this test's event loop
