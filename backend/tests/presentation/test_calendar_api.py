"""End-to-end against a migrated throwaway DB (DATABASE_URL), e.g. nepse_calendar per docs/CONTRACTS.md."""
from datetime import date, timedelta

import httpx
from sqlalchemy import text

from nepse.application.calendar.ports import Announcement
from nepse.infrastructure.db.repositories.calendar import SqlCalendarRepository
from nepse.infrastructure.db.session import SessionLocal, engine
from nepse.main import app


async def test_calendar_flow():  # one test: the module-level engine pool is bound to one event loop
    soon = date.today() + timedelta(days=10)
    async with engine.begin() as conn:
        await conn.execute(text("DELETE FROM dividends WHERE company_id IN (SELECT id FROM companies WHERE symbol = 'CALTEST')"))
        cid = await conn.scalar(text(
            "INSERT INTO companies (symbol, name) VALUES ('CALTEST', 'Calendar Test Co') "
            "ON CONFLICT (symbol) DO UPDATE SET name = EXCLUDED.name RETURNING id"))
        await conn.execute(text(
            "INSERT INTO dividends (company_id, fy_bs, bonus_pct, cash_pct, right_ratio, book_closure_date) VALUES "
            "(:c, '2081/82', 10, 5, NULL, '2025-01-01'), (:c, '2082/83', 0, 0, '1:0.5', :soon)"),
            {"c": cid, "soon": soon})
        await conn.execute(text("DELETE FROM announcements WHERE url LIKE 'https://example.test/%'"))

    async with SessionLocal() as s:
        repo = SqlCalendarRepository(s)
        rows = [Announcement("A", "https://example.test/a", date(2026, 10, 1)),
                Announcement("B", "https://example.test/b", date(2026, 10, 2))]
        assert await repo.upsert_announcements(rows) == 2
        assert await repo.upsert_announcements(rows) == 2  # idempotent: same urls

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
        div = (await c.get("/api/v1/calendar/dividends", params={"symbol": "caltest"})).json()
        assert [d["fy_bs"] for d in div] == ["2081/82"] and div[0]["cash_pct"] == 5
        rights = (await c.get("/api/v1/calendar/rights", params={"symbol": "CALTEST"})).json()
        assert [r["right_ratio"] for r in rights] == ["1:0.5"]
        closures = (await c.get("/api/v1/calendar/book-closures", params={"days": 30})).json()
        assert "CALTEST" in {r["symbol"] for r in closures} and all(r["book_closure_date"] >= date.today().isoformat() for r in closures)
        ann = (await c.get("/api/v1/calendar/announcements")).json()
        assert [a["title"] for a in ann if a["url"].startswith("https://example.test/")] == ["B", "A"]
