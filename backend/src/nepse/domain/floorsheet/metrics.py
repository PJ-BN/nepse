"""Broker / floorsheet analytics (blueprint Module 09). Pure functions; floats are fine for analytics, not accounting."""
import heapq
from collections import defaultdict
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import datetime

WINDOWS = (1, 5, 15, 30, 90)  # trading days
WHALE_QTY = 5_000
WHALE_AMOUNT = 2_500_000
CI_ALERT = 0.45
CI_MAX_FLOAT_CAP = 1_500_000_000
ACCUM_DAYS = 10
ACCUM_TOP = 5
ACCUM_SHARE = 0.35
ACCUM_MAX_ATR_PCT = 0.04


@dataclass(frozen=True)
class BrokerDay:
    """One row of the broker_daily view (or several rows of it summed)."""
    broker: int
    buy_qty: int
    sell_qty: int
    buy_amt: float
    sell_amt: float
    self_trade_qty: int = 0


@dataclass(frozen=True)
class Trade:
    contract_no: int
    symbol: str
    buyer_broker: int
    seller_broker: int
    qty: int
    rate: float
    amount: float
    trade_time: datetime


@dataclass(frozen=True)
class BrokerPosition:
    broker: int
    buy_qty: int
    sell_qty: int
    buy_amt: float
    sell_amt: float

    @property
    def net(self) -> int:
        return self.buy_qty - self.sell_qty

    @property
    def buy_vwap(self) -> float | None:
        return vwap(self.buy_amt, self.buy_qty)

    @property
    def sell_vwap(self) -> float | None:
        return vwap(self.sell_amt, self.sell_qty)


def vwap(amount: float, qty: int) -> float | None:
    """Σ(qty·rate) / Σqty, given the already-summed amount."""
    return amount / qty if qty else None


def operator_margin(ltp: float | None, vwap_: float | None) -> float | None:
    return (ltp - vwap_) / vwap_ if ltp is not None and vwap_ else None


def bar(buy_qty: int, sell_qty: int, total_volume: int) -> float:
    """Broker Accumulation Ratio."""
    return (buy_qty - sell_qty) / total_volume if total_volume else 0.0


def unrealised_pl(p: BrokerPosition, ltp: float | None) -> float | None:
    """Long brokers are marked against their buy VWAP, short brokers against their sell VWAP."""
    cost = p.buy_vwap if p.net > 0 else p.sell_vwap
    return p.net * (ltp - cost) if ltp is not None and cost is not None else None


def positions(rows: Iterable[BrokerDay], exclude_wash: bool = False) -> list[BrokerPosition]:
    """Sum daily rows per broker. exclude_wash drops self-trades (buyer == seller) from both sides."""
    acc: dict[int, list] = defaultdict(lambda: [0, 0, 0.0, 0.0])
    for r in rows:
        buy_qty, sell_qty, buy_amt, sell_amt = r.buy_qty, r.sell_qty, r.buy_amt, r.sell_amt
        if exclude_wash and r.self_trade_qty:
            # ponytail: self-trade amount isn't stored, so assume wash trades printed at the day's VWAP.
            w = r.self_trade_qty
            buy_amt *= (buy_qty - w) / buy_qty if buy_qty else 0
            sell_amt *= (sell_qty - w) / sell_qty if sell_qty else 0
            buy_qty, sell_qty = buy_qty - w, sell_qty - w
        a = acc[r.broker]
        a[0] += buy_qty
        a[1] += sell_qty
        a[2] += buy_amt
        a[3] += sell_amt
    return [BrokerPosition(b, *a) for b, a in acc.items()]


def total_volume(ps: Iterable[BrokerPosition]) -> int:
    """Every trade has exactly one buyer, so the buy side sums to market volume."""
    return sum(p.buy_qty for p in ps)


def top_net_share(ps: Sequence[BrokerPosition], n: int) -> float:
    """Σ NetBuy of the top-n net buyers / TotalVolume."""
    vol = total_volume(ps)
    return sum(heapq.nlargest(n, (p.net for p in ps if p.net > 0))) / vol if vol else 0.0


def cornering_index(ps: Sequence[BrokerPosition]) -> float:
    return top_net_share(ps, 3)


def cornering_alert(ci: float, float_market_cap: float | None) -> bool:
    return float_market_cap is not None and ci > CI_ALERT and float_market_cap < CI_MAX_FLOAT_CAP


def is_wash(t: Trade) -> bool:
    return t.buyer_broker == t.seller_broker


def is_whale(t: Trade) -> bool:
    return t.qty >= WHALE_QTY or t.amount >= WHALE_AMOUNT


def atr_pct(bars: Sequence[tuple[float, float, float]]) -> float | None:
    """Mean true range over (high, low, close) bars, as a fraction of the last close."""
    if not bars or not bars[-1][2]:
        return None
    trs, prev = [], None
    for high, low, close in bars:
        trs.append(high - low if prev is None else max(high, prev) - min(low, prev))
        prev = close
    return sum(trs) / len(trs) / bars[-1][2]


def is_accumulating(top5_share: float, atr: float | None) -> bool:
    """Top-5 net buyers hold > 35% of volume over the window while ATR% stays under 4%."""
    return atr is not None and top5_share > ACCUM_SHARE and atr < ACCUM_MAX_ATR_PCT


def sankey(flows: Iterable[tuple[int, int, int]], top_n: int) -> list[tuple[int, int, int]]:
    """Top-n (buyer, seller, qty) flows, wash trades dropped."""
    acc: dict[tuple[int, int], int] = defaultdict(int)
    for buyer, seller, qty in flows:
        if buyer != seller:
            acc[buyer, seller] += qty
    return [(b, s, q) for (b, s), q in heapq.nlargest(top_n, acc.items(), key=lambda kv: kv[1])]
