from dataclasses import dataclass
from datetime import datetime
from typing import Protocol

from nepse.domain.market.session import MarketStatus


@dataclass(frozen=True)
class Quote:
    symbol: str
    ltp: float
    change: float
    pct_change: float
    volume: int
    turnover: float
    market_cap: float | None = None  # ltp x listed shares; filled by get_market_summary


@dataclass(frozen=True)
class IndexValue:
    code: str
    value: float
    change: float
    pct_change: float
    turnover: float | None = None


class MarketSource(Protocol):
    """Either the live Redis snapshot or the latest end-of-day rows. Empty lists mean "no data here"."""

    async def status(self) -> MarketStatus | None: ...
    async def quotes(self) -> list[Quote]: ...
    async def indices(self) -> list[IndexValue]: ...
    async def as_of(self) -> datetime | None: ...
