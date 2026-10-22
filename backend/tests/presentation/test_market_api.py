from datetime import datetime, timezone

from nepse.application.market.ports import IndexValue, Quote
from nepse.domain.market.session import MarketStatus
from nepse.presentation.api.v1 import market


class FakeSession:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def execute(self, stmt):
        class Row:
            symbol, listed_shares = "NABIL", 1000

        return [Row()]


class Source:
    def __init__(self, quotes=(), indices=(), status=None):
        self._q, self._i, self._s = list(quotes), list(indices), status

    def __call__(self, *_):  # also stands in for the class: RedisLiveMarketSource(redis) / SqlEodMarketSource(s)
        return self

    async def status(self):
        return self._s

    async def quotes(self):
        return self._q

    async def indices(self):
        return self._i

    async def as_of(self):
        return datetime(2025, 1, 5, 11, tzinfo=timezone.utc)


QUOTES = [Quote("NABIL", 500.0, 5.0, 1.01, 100, 50_000.0), Quote("NICA", 300.0, -3.0, -0.99, 50, 15_000.0)]
INDICES = [IndexValue("NEPSE", 2100.0, 10.0, 0.5, 1e6), IndexValue("BANKING", 1500.0, 1.0, 0.07)]


def patch(monkeypatch, live, eod):
    monkeypatch.setattr(market, "SessionLocal", FakeSession)
    monkeypatch.setattr(market, "RedisLiveMarketSource", live)
    monkeypatch.setattr(market, "SqlEodMarketSource", eod)


async def test_summary_live(client, monkeypatch):
    patch(monkeypatch, Source(QUOTES, INDICES, MarketStatus.OPEN), Source())
    body = (await client.get("/api/v1/market/summary")).json()
    assert body["source"] == "live" and body["status"] == "OPEN" and body["index"]["code"] == "NEPSE"
    assert [i["code"] for i in body["sub_indices"]] == ["BANKING"]
    assert (body["advances"], body["declines"]) == (1, 1) and body["turnover"] == 65_000.0
    assert body["gainers"][0]["symbol"] == "NABIL" and body["gainers"][0]["market_cap"] == 500_000.0
    assert body["losers"][0]["symbol"] == "NICA" and body["losers"][0]["market_cap"] is None  # no listed_shares


async def test_summary_falls_back_to_eod_then_empty(client, monkeypatch):
    patch(monkeypatch, Source(), Source(QUOTES, INDICES))
    assert (await client.get("/api/v1/market/summary")).json()["source"] == "eod"
    patch(monkeypatch, Source(), Source())
    body = (await client.get("/api/v1/market/summary")).json()
    assert body["source"] == "empty" and body["index"] is None and body["quotes"] == []
