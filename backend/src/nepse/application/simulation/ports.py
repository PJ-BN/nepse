from datetime import date
from typing import Protocol

from nepse.application.charting.ports import Bar, SymbolInfo


class BarSource(Protocol):
    """Satisfied by SqlChartRepository."""
    async def bars(self, symbol: str, start: date, end: date) -> list[Bar]: ...
    async def find_symbol(self, symbol: str) -> SymbolInfo | None: ...
