from dataclasses import dataclass
from datetime import date
from typing import Protocol


@dataclass(frozen=True)
class FundSnapshot:
    symbol: str
    name: str
    ltp: float | None
    nav: float | None
    nav_date: date | None
    maturity_date: date | None


class MutualFundRepository(Protocol):
    async def snapshots(self) -> list[FundSnapshot]:
        """Active mutual funds with latest close, latest NAV (weekly, else monthly) and maturity date."""
        ...
