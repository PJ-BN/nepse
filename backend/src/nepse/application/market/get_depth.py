from dataclasses import asdict

from nepse.application.ingestion.ports import DepthSource, LiveStore
from nepse.domain.market.depth import MarketDepth


async def get_depth(symbol: str, nepse_id: int, source: DepthSource, store: LiveStore) -> MarketDepth:
    """Cached depth if fresh (the store expires it after a few seconds), else fetch, cache and publish it."""
    if (cached := await store.get_depth(symbol)) is not None:
        return cached
    depth = await source.market_depth(symbol, nepse_id)
    await store.save_depth(depth)
    await store.publish("depth", {symbol: depth})
    return depth


def depth_dict(depth: MarketDepth) -> dict:
    return {**asdict(depth), "ts": depth.ts.isoformat()}
