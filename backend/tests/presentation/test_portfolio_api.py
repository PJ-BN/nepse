"""End-to-end against a migrated DB (DATABASE_URL), e.g. nepse_portfolio per docs/CONTRACTS.md."""
import uuid
from datetime import date, timedelta

import httpx
import pytest
from sqlalchemy import text

from nepse.infrastructure.db.session import engine
from nepse.main import app
from nepse.presentation.api.v1 import auth


@pytest.fixture(autouse=True)
def jwt_secret(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "t" * 32)
    auth._settings.cache_clear()
    yield
    auth._settings.cache_clear()


async def test_portfolio_flow():  # one test: the module-level engine/redis pools are bound to one event loop
    async with engine.begin() as conn:
        cid = await conn.scalar(text(
            "INSERT INTO companies (symbol, name) VALUES ('PFTEST', 'Portfolio Test Co') "
            "ON CONFLICT (symbol) DO UPDATE SET name = EXCLUDED.name RETURNING id"))
        await conn.execute(text(
            "INSERT INTO ohlcv_daily (trade_date, company_id, close, prev_close) VALUES ('2025-10-01', :c, 700, 690) "
            "ON CONFLICT DO NOTHING"), {"c": cid})

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
        assert (await c.post("/api/v1/portfolio/calc", json={"side": "BUY", "qty": 100, "rate": 500})).json()[
            "total_payable"] == "50212.50"
        sell_calc = await c.post("/api/v1/portfolio/calc", json={
            "side": "SELL", "qty": 10, "rate": 800, "buy_rate": 500, "buy_date": "2024-01-01",
            "sell_date": "2025-01-01"})
        assert sell_calc.status_code == 200 and sell_calc.json()["long_term"] is True

        email = f"{uuid.uuid4().hex}@example.com"
        assert (await c.post("/api/v1/auth/register", json={"email": email, "password": "short"})).status_code == 422
        reg = await c.post("/api/v1/auth/register", json={"email": email, "password": "long-enough-pw"})
        assert reg.status_code == 201
        assert (await c.post("/api/v1/auth/register", json={"email": email, "password": "long-enough-pw"})).status_code == 409
        assert (await c.post("/api/v1/auth/login", json={"email": email, "password": "nope-nope"})).status_code == 401
        token = (await c.post("/api/v1/auth/login", json={"email": email, "password": "long-enough-pw"})).json()[
            "access_token"]
        h = {"Authorization": f"Bearer {token}"}

        assert (await c.get("/api/v1/portfolio/holdings")).status_code == 401
        tomorrow = (date.today() + timedelta(days=2)).isoformat()
        bad = [
            {"symbol": "PFTEST", "txn_type": "BUY", "qty": 0, "rate": 500, "txn_date": "2025-01-01"},
            {"symbol": "PFTEST", "txn_type": "BUY", "qty": 1, "rate": 500, "txn_date": tomorrow},
            {"symbol": "NOSUCH", "txn_type": "BUY", "qty": 1, "rate": 500, "txn_date": "2025-01-01"},
            {"symbol": "PF TEST", "txn_type": "BUY", "qty": 1, "rate": 500, "txn_date": "2025-01-01"},
            {"symbol": "PFTEST", "txn_type": "SELL", "qty": 1, "rate": 500, "txn_date": "2025-01-01"},  # nothing held
        ]
        for body in bad:
            assert (await c.post("/api/v1/portfolio/txns", json=body, headers=h)).status_code == 422, body

        for body in [
            {"symbol": "pftest", "txn_type": "BUY", "qty": 100, "rate": 500, "txn_date": "2024-06-01"},
            {"symbol": "PFTEST", "txn_type": "BUY", "qty": 100, "rate": 600, "txn_date": "2025-09-01"},
            {"symbol": "PFTEST", "txn_type": "SELL", "qty": 150, "rate": 800, "txn_date": "2025-10-01"},
        ]:
            r = await c.post("/api/v1/portfolio/txns", json=body, headers=h)
            assert r.status_code == 201, r.text
        assert r.json()["fees"]["cgt"] == "2205.07"

        assert len((await c.get("/api/v1/portfolio/txns", headers=h)).json()) == 3
        [holding] = (await c.get("/api/v1/portfolio/holdings", headers=h)).json()
        assert holding["qty"] == 50 and holding["wacc"] == "552.22"
        assert holding["ltp"] is not None  # live quote or the EOD fallback
        realized = (await c.get("/api/v1/portfolio/realized", headers=h)).json()
        assert realized["total_realized_pnl"] == "37027.43"
    await engine.dispose()
