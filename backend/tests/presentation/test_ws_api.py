"""WS /api/v1/ws/live against a fake Redis (the app's real pool is bound to the test session's event loop)."""
import asyncio
import json
import time

import pytest
from starlette.testclient import TestClient

from nepse.main import app
from nepse.presentation.api.v1 import ws

QUOTE = {"symbol": "NABIL", "ltp": 500.0, "ts": "2025-01-05T11:00:00+05:45"}
INDEX = {"code": "NEPSE", "value": 2100.5, "ts": "2025-01-05T11:00:00+05:45"}


class FakePipe:
    def __init__(self, r):
        self.r, self.keys = r, []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    def get(self, k):
        self.keys.append(k)
        return self

    hgetall = get

    async def execute(self):
        return [self.r.data[k] for k in self.keys]


class FakePubSub:
    def __init__(self):
        self.q = asyncio.Queue()
        self.loop = None

    async def __aenter__(self):
        self.loop = asyncio.get_running_loop()
        return self

    async def __aexit__(self, *a):
        return False

    async def subscribe(self, channel):
        assert channel == "nepse:live:events"

    async def listen(self):
        yield {"type": "subscribe", "data": 1}
        while True:
            yield {"type": "message", "data": await self.q.get()}

    def push(self, msg):  # called from the test thread
        self.loop.call_soon_threadsafe(self.q.put_nowait, msg)


class FakeRedis:
    def __init__(self):
        self.data = {
            "nepse:live:status": "OPEN",
            "nepse:live:quotes": {"NABIL": json.dumps(QUOTE)},
            "nepse:live:indices": {"NEPSE": json.dumps(INDEX)},
        }
        self.pubsub_conn = FakePubSub()

    def pipeline(self, transaction=False):
        return FakePipe(self)

    def pubsub(self):
        return self.pubsub_conn


@pytest.fixture
def fake_redis(monkeypatch):
    r = FakeRedis()
    monkeypatch.setattr(ws, "redis", r)
    return r


def test_snapshot_on_connect(fake_redis):
    with TestClient(app).websocket_connect("/api/v1/ws/live") as sock:
        snap = sock.receive_json()
    assert snap == {"topic": "snapshot", "data": {"status": "OPEN", "quotes": {"NABIL": QUOTE}, "indices": {"NEPSE": INDEX}}}


def test_subscribe_filters_topics(fake_redis):
    sub = fake_redis.pubsub_conn
    with TestClient(app).websocket_connect("/api/v1/ws/live") as sock:
        sock.receive_json()  # snapshot
        sock.send_text("not json")  # ignored; the connection survives
        sock.send_json({"subscribe": ["quote", "bogus"]})
        for _ in range(100):  # wait for the server tasks to start and apply the subscription
            if sub.loop is not None:
                break
            time.sleep(0.02)
        assert sub.loop is not None
        time.sleep(0.2)
        quote_msg = json.dumps({"topic": "quote", "data": {"NABIL": QUOTE}})
        sub.push(json.dumps({"topic": "index", "data": {}}))  # not subscribed: dropped
        sub.push("garbage")  # not JSON: skipped
        sub.push(quote_msg)
        assert sock.receive_text() == quote_msg  # forwarded unchanged; the index event never arrives
