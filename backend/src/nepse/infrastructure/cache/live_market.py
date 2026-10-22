"""Reads the live keys that feat/ingestion writes (see docs/CONTRACTS.md, "Live data")."""
import json
from datetime import datetime

from redis.asyncio import Redis

from nepse.application.market.ports import IndexValue, Quote
from nepse.domain.market.session import MarketStatus

STATUS_KEY, QUOTES_KEY, INDICES_KEY = "nepse:live:status", "nepse:live:quotes", "nepse:live:indices"
EVENTS_CHANNEL = "nepse:live:events"


async def live_snapshot(redis: Redis) -> dict:
    """The raw contract payloads: {"status", "quotes": {symbol: {...}}, "indices": {code: {...}}}."""
    async with redis.pipeline(transaction=False) as p:
        status, quotes, indices = await p.get(STATUS_KEY).hgetall(QUOTES_KEY).hgetall(INDICES_KEY).execute()
    return {
        "status": status,
        "quotes": {k: json.loads(v) for k, v in quotes.items()},
        "indices": {k: json.loads(v) for k, v in indices.items()},
    }


class RedisLiveMarketSource:
    def __init__(self, redis: Redis):
        self.redis = redis
        self._snap: dict | None = None

    async def _snapshot(self) -> dict:
        if self._snap is None:
            self._snap = await live_snapshot(self.redis)
        return self._snap

    async def status(self) -> MarketStatus | None:
        raw = (await self._snapshot())["status"]
        return MarketStatus(raw) if raw in MarketStatus.__members__ else None

    async def as_of(self) -> datetime | None:
        snap = await self._snapshot()
        stamps = [v["ts"] for v in (*snap["quotes"].values(), *snap["indices"].values()) if v.get("ts")]
        return datetime.fromisoformat(max(stamps)) if stamps else None

    async def quotes(self) -> list[Quote]:
        return [
            Quote(v["symbol"], float(v["ltp"]), float(v.get("change") or 0), float(v.get("pct_change") or 0),
                  int(v.get("volume") or 0), float(v.get("turnover") or 0))
            for v in (await self._snapshot())["quotes"].values()
        ]

    async def indices(self) -> list[IndexValue]:
        return [
            IndexValue(v["code"], float(v["value"]), float(v.get("change") or 0), float(v.get("pct_change") or 0),
                       float(v["turnover"]) if v.get("turnover") is not None else None)
            for v in (await self._snapshot())["indices"].values()
        ]
