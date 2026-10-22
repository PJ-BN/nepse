from datetime import UTC, datetime

import pytest

from nepse.application.floorsheet.ports import BrokerStockRow, Company
from nepse.domain.floorsheet.metrics import BrokerDay, Trade
from nepse.presentation.api.v1.floorsheet import get_repo

START = datetime(2025, 1, 1, tzinfo=UTC)


class FakeRepo:
    def __init__(self):
        self.whale_args = None

    async def company(self, symbol):
        return Company(1, "NABIL", 1_000_000) if symbol.upper() == "NABIL" else None

    async def window_start(self, days, *, full=False):
        return START

    async def broker_rows(self, start, *, symbol=None, broker=None):
        rows = [BrokerStockRow("NABIL", "BANKING", BrokerDay(1, 600, 100, 300_000, 55_000)),
                BrokerStockRow("NABIL", "BANKING", BrokerDay(2, 100, 600, 55_000, 330_000))]
        return [r for r in rows if broker is None or r.row.broker == broker]

    async def ltp(self, company_id):
        return 520.0

    async def flows(self, company_id, start):
        return [(1, 2, 500)]

    async def daily_bars(self, start):
        return {}

    async def recent_whales(self, symbol, limit):
        self.whale_args = (symbol, limit)
        return [Trade(7, "NABIL", 1, 2, 6000, 500.0, 3_000_000.0, datetime(2025, 1, 1, 6, 0, tzinfo=UTC))]


@pytest.fixture
def repo(override):
    r = FakeRepo()
    override(get_repo, r)
    return r


async def test_analytics(client, repo):
    body = (await client.get("/api/v1/floorsheet/analytics", params={"symbol": "nabil", "days": 5})).json()
    assert body["symbol"] == "NABIL" and body["days"] == 5 and body["total_volume"] == 700
    assert [r["broker"] for r in body["rows"]] == [1, 2]  # biggest net buyer first
    assert body["sankey"] == [{"buyer": 1, "seller": 2, "qty": 500}]

    only = (await client.get("/api/v1/floorsheet/analytics", params={"symbol": "NABIL", "broker_no": 2})).json()
    assert [r["broker"] for r in only["rows"]] == [2]


async def test_analytics_errors(client, repo):
    assert (await client.get("/api/v1/floorsheet/analytics", params={"symbol": "NOPE"})).status_code == 404
    for days in (0, 91):
        r = await client.get("/api/v1/floorsheet/analytics", params={"symbol": "NABIL", "days": days})
        assert r.status_code == 422
    assert (await client.get("/api/v1/floorsheet/analytics")).status_code == 422


async def test_broker_profile(client, repo):
    body = (await client.get("/api/v1/floorsheet/broker/1")).json()
    assert body["broker"] == 1
    assert [w["label"] for w in body["windows"]] == ["today", "week", "month"]
    assert body["windows"][0]["top_stocks"][0]["symbol"] == "NABIL"
    assert (await client.get("/api/v1/floorsheet/broker/abc")).status_code == 422


async def test_accumulation_empty_without_full_window(client, override):
    class Empty(FakeRepo):
        async def window_start(self, days, *, full=False):
            return None

    override(get_repo, Empty())
    assert (await client.get("/api/v1/floorsheet/accumulation")).json() == []


async def test_whales(client, repo):
    [w] = (await client.get("/api/v1/floorsheet/whales", params={"symbol": "NABIL", "limit": 10})).json()
    assert w["contract_no"] == 7 and w["qty"] == 6000 and w["trade_time"].endswith("+05:45")
    assert repo.whale_args == ("NABIL", 10)
    assert (await client.get("/api/v1/floorsheet/whales", params={"limit": 201})).status_code == 422
