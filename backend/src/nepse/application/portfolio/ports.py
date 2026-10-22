from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol

from nepse.domain.portfolio.wacc import Txn


@dataclass(frozen=True)
class StoredTxn:
    id: int
    symbol: str
    txn: Txn
    fees: dict


@dataclass(frozen=True)
class Quote:
    ltp: Decimal
    prev_close: Decimal | None


class TxnRepo(Protocol):
    async def symbol_exists(self, symbol: str) -> bool: ...

    async def list_for_user(self, user_id: int) -> list[StoredTxn]:
        """Ordered by txn date, then entry order."""
        ...

    async def add(self, user_id: int, symbol: str, txn: Txn, fees: dict) -> int: ...


class PriceSource(Protocol):
    async def quotes(self, symbols: list[str]) -> dict[str, Quote]:
        """Live quote when available, else the latest EOD close; symbols with no price are omitted."""
        ...
