"""Top-of-book order depth for one symbol."""
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True, slots=True)
class DepthLevel:
    price: float
    qty: int
    orders: int


@dataclass(frozen=True, slots=True)
class MarketDepth:
    symbol: str
    buy: tuple[DepthLevel, ...]  # best bid first
    sell: tuple[DepthLevel, ...]  # best ask first
    total_buy_qty: int
    total_sell_qty: int
    ts: datetime
