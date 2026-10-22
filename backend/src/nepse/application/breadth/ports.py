from datetime import date
from typing import Protocol


class BreadthRepository(Protocol):
    async def adjusted_closes(self, days: int) -> dict[str, list[tuple[date, float]]]:
        """Per active symbol, (trade_date, close * adj_factor) for the last `days` calendar days, oldest first."""
        ...
