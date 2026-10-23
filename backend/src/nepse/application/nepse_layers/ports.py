from dataclasses import dataclass
from datetime import date, datetime
from typing import Protocol


@dataclass(frozen=True)
class DailyClose:
    trade_date: date
    prev_close: float | None
    adj_factor: float


class NepseLayersRepository(Protocol):
    async def daily_closes(self, symbol: str, start: date, end: date) -> list[DailyClose]:
        """Oldest first; prev_close falls back to the earlier bar's close, None for the first bar ever."""

    async def trade_levels(self, symbol: str, start: datetime, end: datetime) -> list[tuple[float, int]]:
        """(rate, qty summed) per distinct trade rate from floorsheet ticks in [start, end)."""
