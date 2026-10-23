from datetime import UTC, date, datetime

import pytest

from nepse.application.charting.ports import Bar, IntradayBar, SymbolInfo
from nepse.presentation.api.v1.udf import chart_repo

NABIL = SymbolInfo("NABIL", "Nabil Bank", "BANKING")
DAY = date(2025, 1, 5)
TS = int(datetime(2025, 1, 5, tzinfo=UTC).timestamp())


class FakeRepo:
    def __init__(self):
        self.calls = []

    async def find_symbol(self, symbol):
        return NABIL if symbol == "NABIL" else None

    async def search_symbols(self, query, limit):
        self.calls.append(("search", query, limit))
        return [NABIL] if query.upper() in ("", "NAB") else []

    async def bars(self, symbol, start, end):
        return [Bar(DAY, 100, 110, 90, 105, 1000, adj_factor=0.5)] if symbol == "NABIL" else []

    async def last_date_before(self, symbol, d):
        return date(2024, 12, 1) if symbol == "NABIL" else None

    async def intraday_bars(self, symbol, start, end, minutes):
        self.calls.append(("intraday", minutes))
        return [IntradayBar(datetime(2025, 1, 5, 5, 30, tzinfo=UTC), 1, 2, 0.5, 1.5, 7)] if symbol == "NABIL" else []


@pytest.fixture
def repo(override):
    r = FakeRepo()
    override(chart_repo, r)
    return r


async def test_config(client):
    body = (await client.get("/api/v1/udf/config")).json()
    assert body["supported_resolutions"] == ["1", "5", "15", "60", "1D", "1W", "1M"]
    assert body["supports_search"] is True and body["supports_time"] is False


async def test_symbols(client, repo):
    ok = (await client.get("/api/v1/udf/symbols", params={"symbol": "NEPSE:nabil"})).json()
    assert ok["ticker"] == "NABIL" and ok["timezone"] == "Asia/Kathmandu" and ok["sector"] == "BANKING"
    assert (await client.get("/api/v1/udf/symbols", params={"symbol": "NOPE"})).status_code == 404


async def test_search(client, repo):
    [hit] = (await client.get("/api/v1/udf/search", params={"query": " nab ", "limit": 5})).json()
    assert hit["symbol"] == "NABIL" and hit["exchange"] == "NEPSE" and hit["description"] == "Nabil Bank"
    assert repo.calls == [("search", "nab", 5)]
    assert (await client.get("/api/v1/udf/search", params={"query": "zzz"})).json() == []
    assert (await client.get("/api/v1/udf/search", params={"limit": 0})).status_code == 422


async def test_daily_history_adjusted_and_raw(client, repo):
    p = {"symbol": "NABIL", "from": TS - 86400, "to": TS + 86400, "resolution": "1D"}
    adj = (await client.get("/api/v1/udf/history", params=p)).json()
    assert adj["s"] == "ok" and adj["t"] == [TS] and adj["c"] == [52.5] and adj["v"] == [2000]
    raw = (await client.get("/api/v1/udf/history", params={**p, "adjusted": "false"})).json()
    assert raw["c"] == [105] and raw["o"] == [100] and raw["v"] == [1000]


async def test_weekly_monthly_history(client, repo):
    p = {"symbol": "NABIL", "from": TS - 86400, "to": TS + 86400}
    w = (await client.get("/api/v1/udf/history", params={**p, "resolution": "1W"})).json()
    assert w["s"] == "ok" and w["t"] == [TS] and w["c"] == [52.5]  # 2025-01-05 is a Sunday: its own week start
    m = (await client.get("/api/v1/udf/history", params={**p, "resolution": "1M"})).json()
    assert m["t"] == [TS - 4 * 86400]  # 2025-01-01


async def test_history_no_data_and_errors(client, repo):
    p = {"symbol": "ZZZ", "from": TS, "to": TS + 1}
    assert (await client.get("/api/v1/udf/history", params=p)).json() == {"s": "no_data"}
    bad = (await client.get("/api/v1/udf/history", params={**p, "resolution": "3W"})).json()
    assert bad["s"] == "error" and "3W" in bad["errmsg"]
    assert (await client.get("/api/v1/udf/history", params={"symbol": "NABIL"})).status_code == 422  # from/to required


async def test_intraday_history(client, repo):
    p = {"symbol": "NEPSE:NABIL", "from": TS, "to": TS + 86400, "resolution": "5"}
    body = (await client.get("/api/v1/udf/history", params=p)).json()
    assert body["s"] == "ok" and body["h"] == [2] and body["v"] == [7] and body["t"] == [TS + 5.5 * 3600]
    assert ("intraday", 5) in repo.calls
    assert (await client.get("/api/v1/udf/history", params={**p, "symbol": "ZZZ"})).json() == {"s": "no_data"}
