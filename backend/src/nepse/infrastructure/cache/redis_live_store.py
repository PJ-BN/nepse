"""LiveStore over Redis, using the key and message formats in docs/CONTRACTS.md."""
import json
from dataclasses import asdict
from datetime import datetime

from redis.asyncio import Redis

from nepse.domain.market.entities import IndexTick, Quote
from nepse.domain.market.session import MarketStatus

STATUS_KEY, QUOTES_KEY, INDICES_KEY = "nepse:live:status", "nepse:live:quotes", "nepse:live:indices"
EVENTS_CHANNEL = "nepse:live:events"


def _json(obj) -> str:
    return json.dumps(obj, default=lambda v: v.isoformat() if isinstance(v, datetime) else str(v))


def _quote(raw: str) -> Quote:
    d = json.loads(raw)
    return Quote(**{**d, "ts": datetime.fromisoformat(d["ts"])})


def _index(raw: str) -> IndexTick:
    d = json.loads(raw)
    return IndexTick(**{**d, "ts": datetime.fromisoformat(d["ts"])})


class RedisLiveStore:
    def __init__(self, redis: Redis) -> None:
        self._redis = redis

    async def get_status(self) -> MarketStatus | None:
        raw = await self._redis.get(STATUS_KEY)
        return MarketStatus(raw) if raw else None

    async def get_quotes(self) -> dict[str, Quote]:
        return {k: _quote(v) for k, v in (await self._redis.hgetall(QUOTES_KEY)).items()}

    async def get_indices(self) -> dict[str, IndexTick]:
        return {k: _index(v) for k, v in (await self._redis.hgetall(INDICES_KEY)).items()}

    async def save(self, status: MarketStatus, quotes: dict[str, Quote], indices: dict[str, IndexTick]) -> None:
        async with self._redis.pipeline(transaction=True) as pipe:
            pipe.set(STATUS_KEY, status.value)
            if quotes:
                pipe.hset(QUOTES_KEY, mapping={k: _json(asdict(v)) for k, v in quotes.items()})
            if indices:
                pipe.hset(INDICES_KEY, mapping={k: _json(asdict(v)) for k, v in indices.items()})
            await pipe.execute()

    async def publish(self, topic: str, data: object) -> None:
        if isinstance(data, dict):
            data = {k: asdict(v) if hasattr(v, "__dataclass_fields__") else v for k, v in data.items()}
        await self._redis.publish(EVENTS_CHANNEL, _json({"topic": topic, "data": data}))
