import json
from datetime import datetime

import pytest

from nepse.domain.calendar.npt import NPT
from nepse.domain.market.depth import DepthLevel, MarketDepth
from nepse.domain.market.entities import IndexTick, Quote
from nepse.domain.market.session import Halt, HaltState, MarketStatus
from nepse.infrastructure.cache.redis_live_store import (
    DEPTH_KEY, DEPTH_TTL, EVENTS_CHANNEL, HALT_KEY, QUOTES_KEY, STATUS_KEY, RedisLiveStore,
)

TS = datetime(2025, 1, 5, 11, 0, tzinfo=NPT)
Q = Quote("NABIL", 500.0, 495.0, 505.0, 490.0, 498.0, 2.0, 0.4, 100, 50000.0, TS)
IDX = IndexTick("NEPSE", 2100.5, 10.0, 0.48, None, TS)


class FakePipe:
    def __init__(self, r):
        self.r, self.ops = r, []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    def set(self, k, v):
        self.ops.append(lambda: self.r.set_(k, v))

    def hset(self, k, mapping):
        self.ops.append(lambda: self.r.hset_(k, mapping))

    async def execute(self):
        for op in self.ops:
            op()


class FakeRedis:
    def __init__(self):
        self.kv, self.hashes, self.ttl, self.published = {}, {}, {}, []

    def set_(self, k, v, ex=None):
        self.kv[k] = str(v)
        self.ttl[k] = ex

    def hset_(self, k, mapping):
        self.hashes.setdefault(k, {}).update(mapping)

    async def set(self, k, v, ex=None):
        self.set_(k, v, ex)

    async def get(self, k):
        return self.kv.get(k)

    async def hgetall(self, k):
        return dict(self.hashes.get(k, {}))

    async def publish(self, channel, msg):
        self.published.append((channel, msg))

    def pipeline(self, transaction=True):
        return FakePipe(self)


@pytest.fixture
def r():
    return FakeRedis()


@pytest.fixture
def store(r):
    return RedisLiveStore(r)


async def test_empty_store(store):
    assert await store.get_status() is None
    assert await store.get_quotes() == {} and await store.get_indices() == {}
    assert await store.get_last_contract() is None and await store.get_halt() is None
    assert await store.get_depth("NABIL") is None


async def test_save_roundtrip_and_contract_format(store, r):
    await store.save(MarketStatus.OPEN, {"NABIL": Q}, {"NEPSE": IDX})
    assert r.kv[STATUS_KEY] == "OPEN"
    raw = json.loads(r.hashes[QUOTES_KEY]["NABIL"])
    assert set(raw) == {"symbol", "ltp", "open", "high", "low", "prev_close", "change", "pct_change", "volume",
                        "turnover", "ts"}
    assert raw["ts"] == TS.isoformat()
    assert await store.get_status() is MarketStatus.OPEN
    assert await store.get_quotes() == {"NABIL": Q}
    assert await store.get_indices() == {"NEPSE": IDX}


async def test_save_with_nothing_to_write_only_sets_status(store, r):
    await store.save(MarketStatus.CLOSED, {}, {})
    assert r.kv == {STATUS_KEY: "CLOSED"} and r.hashes == {}


async def test_last_contract(store):
    await store.set_last_contract(12345)
    assert await store.get_last_contract() == 12345


async def test_halt_roundtrip_with_expiry(store, r):
    h = HaltState(Halt.MIN_20, TS)
    await store.set_halt(h)
    assert r.ttl[HALT_KEY] == 86400
    assert await store.get_halt() == h


async def test_depth_roundtrip_with_short_ttl(store, r):
    d = MarketDepth("NABIL", (DepthLevel(499.0, 100, 3),), (DepthLevel(501.0, 50, 2),), 100, 50, TS)
    await store.save_depth(d)
    assert r.ttl[DEPTH_KEY + "NABIL"] == DEPTH_TTL == 10
    assert await store.get_depth("NABIL") == d
    assert json.loads(r.kv[DEPTH_KEY + "NABIL"])["buy"] == [{"price": 499.0, "qty": 100, "orders": 3}]


async def test_publish_serialises_dataclasses_and_wraps_topic(store, r):
    await store.publish("quote", {"NABIL": Q})
    await store.publish("whale", {"contract_no": 1, "symbol": "NABIL"})
    (ch1, m1), (ch2, m2) = r.published
    assert ch1 == ch2 == EVENTS_CHANNEL
    quote = json.loads(m1)
    assert quote["topic"] == "quote" and quote["data"]["NABIL"]["ltp"] == 500.0
    assert quote["data"]["NABIL"]["ts"] == TS.isoformat()
    assert json.loads(m2) == {"topic": "whale", "data": {"contract_no": 1, "symbol": "NABIL"}}
