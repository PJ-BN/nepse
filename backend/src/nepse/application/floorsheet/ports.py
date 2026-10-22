from dataclasses import dataclass
from datetime import datetime
from typing import Protocol

from nepse.domain.floorsheet.metrics import BrokerDay, Trade


@dataclass(frozen=True)
class Company:
    id: int
    symbol: str
    public_shares: int | None


@dataclass(frozen=True)
class BrokerStockRow:
    """broker_daily summed over a window for one (symbol, broker)."""
    symbol: str
    sector: str | None
    row: BrokerDay


class FloorsheetRepository(Protocol):
    async def company(self, symbol: str) -> Company | None: ...

    async def window_start(self, days: int, *, full: bool = False) -> datetime | None:
        """First day of the last `days` trading days, or None when there is no data.

        With full=True, also None unless at least `days` trading days exist."""

    async def broker_rows(
        self, start: datetime, *, symbol: str | None = None, broker: int | None = None
    ) -> list[BrokerStockRow]: ...

    async def ltp(self, company_id: int) -> float | None: ...

    async def flows(self, company_id: int, start: datetime) -> list[tuple[int, int, int]]:
        """(buyer, seller, qty) summed per broker pair since `start`."""

    async def daily_bars(self, start: datetime) -> dict[str, list[tuple[float, float, float]]]:
        """(high, low, close) per symbol since `start`, oldest first."""

    async def recent_whales(self, symbol: str | None, limit: int) -> list[Trade]: ...
