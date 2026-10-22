from typing import Protocol

from nepse.application.screener.filter_ast import Node, SortKey


class ScreenerRepository(Protocol):
    async def query(self, node: Node | None, sort: list[SortKey], limit: int) -> list[dict]:
        """Rows of mv_screener_snapshot (keys = filter_ast.OUTPUT_COLUMNS) matching node."""
        ...

    async def refresh(self) -> None:
        """REFRESH MATERIALIZED VIEW CONCURRENTLY mv_screener_snapshot."""
        ...
