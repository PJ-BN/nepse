from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime
from typing import TypeVar

from nepse.application.ingestion.ports import LiveStore, MarketDataSource
from nepse.domain.market.session import MarketStatus, market_status, next_halt

T = TypeVar("T")


@dataclass(frozen=True, slots=True)
class PollResult:
    status: MarketStatus
    quotes_changed: int
    indices_changed: int


def changed(old: Mapping[str, T], new: Mapping[str, T]) -> dict[str, T]:
    return {key: value for key, value in new.items() if old.get(key) != value}


async def poll_live_market(source: MarketDataSource, store: LiveStore, now: datetime) -> PollResult:
    """One poll: fetch quotes/indices, store the full snapshot, publish only what changed."""
    upstream = await source.market_open()
    # upstream "CLOSE" during clock hours is reported as CLOSED (holiday)
    status = market_status(now) if upstream.is_open else MarketStatus.CLOSED

    old_status, old_quotes, old_indices = await store.get_status(), await store.get_quotes(), await store.get_indices()
    quotes = {q.symbol: q for q in await source.live_quotes()}
    indices = {i.code: i for i in await source.live_indices()}
    new_quotes, new_indices = changed(old_quotes, quotes), changed(old_indices, indices)

    if status is MarketStatus.OPEN and "NEPSE" in indices:
        # ponytail: NEPSE exposes no halt flag, so infer it from the index move; a poll gap can delay the trigger
        halt = next_halt(await store.get_halt(), indices["NEPSE"].pct_change, now)
        if halt:
            await store.set_halt(halt)
            if now < halt.until:
                status = MarketStatus.HALTED

    await store.save(status, quotes, indices)
    if status != old_status:
        await store.publish("status", status.value)
    if new_quotes:
        await store.publish("quote", new_quotes)
    if new_indices:
        await store.publish("index", new_indices)
    return PollResult(status, len(new_quotes), len(new_indices))
