from dataclasses import dataclass
from datetime import date, datetime
from typing import Protocol

from nepse.domain.corporate_actions.adjustment import CorporateAction


@dataclass(frozen=True)
class Bar:
    trade_date: date
    open: float
    high: float
    low: float
    close: float
    volume: int
    adj_factor: float = 1.0


@dataclass(frozen=True)
class IntradayBar:
    ts: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int


@dataclass(frozen=True)
class SymbolInfo:
    symbol: str
    name: str
    sector: str | None = None


class ChartRepository(Protocol):
    async def bars(self, symbol: str, start: date, end: date) -> list[Bar]: ...
    async def intraday_bars(self, symbol: str, start: datetime, end: datetime, minutes: int) -> list[IntradayBar]: ...
    async def last_date_before(self, symbol: str, d: date) -> date | None: ...
    async def find_symbol(self, symbol: str) -> SymbolInfo | None: ...
    async def search_symbols(self, query: str, limit: int) -> list[SymbolInfo]: ...


class AdjustmentRepository(Protocol):
    async def closes(self, company_id: int) -> list[tuple[date, float]]: ...
    async def actions(self, company_id: int) -> list[tuple[int, CorporateAction]]: ...  # (action id, action)
    async def save_factors(
        self, company_id: int, daily: list[tuple[date, float]], per_action: list[tuple[int, float]]
    ) -> None: ...
