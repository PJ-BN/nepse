from datetime import date

import pytest

from nepse.application.fundamentals.ports import CompanyRow, PriceInfo, QuarterRow, UpstreamError
from nepse.presentation.api.v1 import company

NABIL = CompanyRow(1, "NABIL", "Nabil Bank", "BANKING", "EQUITY", 1_000_000, 300_000, 700_000, 1e8, None, None)


class FakeRepo:
    async def company(self, symbol):
        return NABIL if symbol == "NABIL" else None

    async def quarters(self, company_id, limit):
        return [QuarterRow("2082/83", 4, date(2026, 7, 16), eps=20.0, bvps=200.0)]

    async def dividends(self, company_id):
        return []

    async def latest_price(self, company_id):
        return PriceInfo(500.0, date(2026, 10, 21), 600.0, 400.0)

    async def latest_nav(self, company_id):
        return None


class FakeRedis:
    def __init__(self, raw=None, fail=False):
        self.raw, self.fail = raw, fail

    async def hget(self, key, field):
        if self.fail:
            raise ConnectionError
        return self.raw


@pytest.fixture(autouse=True)
def repo(override, monkeypatch):
    override(company._repo, FakeRepo())
    monkeypatch.setattr(company, "redis", FakeRedis())


async def test_full_uses_eod_price_and_default_dcf(client):
    body = (await client.get("/api/v1/company/nabil/full")).json()
    assert body["profile"]["symbol"] == "NABIL" and body["price"]["source"] == "eod" and body["price"]["ltp"] == 500.0
    assert body["valuation"]["pe"] == 25.0 and body["valuation"]["pb"] == 2.5
    assert body["quote"] is None and body["depth"] is None  # no live quote, company has no nepse_id
    assert body["valuation"]["dcf"]["risk_free_rate"] == 0.06 and body["valuation"]["dcf"]["growth"] == 0.05


async def test_full_prefers_live_quote(client, monkeypatch):
    monkeypatch.setattr(company, "redis", FakeRedis('{"symbol": "NABIL", "ltp": 550, "ts": "2026-10-22T11:00:00+05:45"}'))
    body = (await client.get("/api/v1/company/NABIL/full")).json()
    assert body["price"]["source"] == "live" and body["price"]["ltp"] == 550.0 and body["quote"]["ltp"] == 550


async def test_full_survives_redis_outage(client, monkeypatch):
    monkeypatch.setattr(company, "redis", FakeRedis(fail=True))
    assert (await client.get("/api/v1/company/NABIL/full")).json()["price"]["source"] == "eod"


async def test_full_dcf_params_change_valuation(client):
    base = (await client.get("/api/v1/company/NABIL/full")).json()["valuation"]["dcf"]
    custom = (await client.get("/api/v1/company/NABIL/full", params={
        "risk_free_rate": 0.1, "dcf_growth": 0.02, "terminal_growth": 0.01})).json()["valuation"]["dcf"]
    assert (custom["risk_free_rate"], custom["growth"], custom["terminal_growth"]) == (0.1, 0.02, 0.01)
    assert custom["per_share"] < base["per_share"]


@pytest.mark.parametrize("params", [
    {"risk_free_rate": -0.01}, {"risk_free_rate": 0.51}, {"dcf_growth": -0.51}, {"dcf_growth": 1.01},
    {"terminal_growth": -0.01}, {"terminal_growth": 0.11},
])
async def test_full_rejects_out_of_range_dcf_params(client, params):
    assert (await client.get("/api/v1/company/NABIL/full", params=params)).status_code == 422


async def test_full_unknown_symbol(client):
    assert (await client.get("/api/v1/company/NOPE/full")).status_code == 404


async def test_refresh_guard_over_http(client, monkeypatch):
    monkeypatch.delenv("NEPSE_DEV_ENDPOINTS", raising=False)
    monkeypatch.delenv("NEPSE_ADMIN_TOKEN", raising=False)
    assert (await client.post("/api/v1/company/NABIL/refresh")).status_code == 404  # off by default
    monkeypatch.setenv("NEPSE_DEV_ENDPOINTS", "1")
    monkeypatch.setenv("NEPSE_ADMIN_TOKEN", "s3cret")
    assert (await client.post("/api/v1/company/NABIL/refresh")).status_code == 403
    assert (await client.post("/api/v1/company/NABIL/refresh", headers={"X-Admin-Token": "bad"})).status_code == 403


async def test_refresh_maps_upstream_errors(client, monkeypatch):
    monkeypatch.setenv("NEPSE_DEV_ENDPOINTS", "1")
    monkeypatch.delenv("NEPSE_ADMIN_TOKEN", raising=False)

    async def boom(*a, **k):
        raise UpstreamError("source down")

    monkeypatch.setattr(company, "ingest_financials", boom)
    r = await client.post("/api/v1/company/NABIL/refresh")
    assert r.status_code == 502 and "source down" in r.text
