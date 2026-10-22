"""Floorsheet / broker use cases."""
from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime

from nepse.application.floorsheet.ports import FloorsheetRepository
from nepse.domain.calendar.npt import NPT
from nepse.domain.floorsheet import metrics as m

SANKEY_TOP_N = 20
PROFILE_WINDOWS = (("today", 1), ("week", 5), ("month", 22))
PROFILE_TOP = 10


@dataclass
class CostBasisRow:
    broker: int
    buy_qty: int
    sell_qty: int
    net: int
    buy_vwap: float | None
    sell_vwap: float | None
    bar: float
    margin_pct: float | None  # (LTP - buy VWAP) / buy VWAP
    unrealised_pl: float | None


@dataclass
class SankeyLink:
    buyer: int
    seller: int
    qty: int


@dataclass
class BrokerAnalytics:
    symbol: str
    days: int
    from_day: datetime | None
    ltp: float | None
    total_volume: int
    cornering_index: float
    float_market_cap: float | None
    cornering_alert: bool
    rows: list[CostBasisRow]
    sankey: list[SankeyLink]


async def get_broker_analytics(
    repo: FloorsheetRepository, symbol: str, days: int, broker_no: int | None = None, exclude_wash: bool = False
) -> BrokerAnalytics:
    """Cost-basis matrix of every broker in `symbol` over the last `days` trading days.

    broker_no narrows the matrix rows and Sankey to that broker; BAR and CI are always market-wide.
    Raises LookupError for an unknown symbol.
    """
    company = await repo.company(symbol)
    if company is None:
        raise LookupError(symbol)
    start = await repo.window_start(days)
    if start is None:
        return BrokerAnalytics(company.symbol, days, None, None, 0, 0.0, None, False, [], [])

    ps = m.positions((r.row for r in await repo.broker_rows(start, symbol=company.symbol)), exclude_wash)
    vol = m.total_volume(ps)
    ltp = await repo.ltp(company.id)
    ci = m.cornering_index(ps)
    float_cap = company.public_shares * ltp if company.public_shares and ltp is not None else None
    rows = [
        CostBasisRow(
            p.broker, p.buy_qty, p.sell_qty, p.net, p.buy_vwap, p.sell_vwap,
            m.bar(p.buy_qty, p.sell_qty, vol), m.operator_margin(ltp, p.buy_vwap), m.unrealised_pl(p, ltp),
        )
        for p in sorted(ps, key=lambda p: p.net, reverse=True)
        if broker_no is None or p.broker == broker_no
    ]
    flows = await repo.flows(company.id, start)
    if broker_no is not None:
        flows = [f for f in flows if broker_no in f[:2]]
    links = [SankeyLink(*f) for f in m.sankey(flows, SANKEY_TOP_N)]
    return BrokerAnalytics(
        company.symbol, days, start, ltp, vol, ci, float_cap, m.cornering_alert(ci, float_cap), rows, links
    )


@dataclass
class StockAccumulation:
    symbol: str
    sector: str | None
    net_qty: int
    net_amt: float
    buy_vwap: float | None


@dataclass
class ProfileWindow:
    label: str
    days: int
    from_day: datetime | None
    top_stocks: list[StockAccumulation]
    sectors: dict[str, float]  # net NPR bought per sector, largest first


@dataclass
class BrokerProfile:
    broker: int
    windows: list[ProfileWindow]


async def get_broker_profile(repo: FloorsheetRepository, broker_no: int) -> BrokerProfile:
    """Top accumulated stocks and sector rotation for one broker, today / this week / this month."""
    windows = []
    for label, days in PROFILE_WINDOWS:
        start = await repo.window_start(days)
        rows = await repo.broker_rows(start, broker=broker_no) if start else []
        stocks = [
            StockAccumulation(r.symbol, r.sector, r.row.buy_qty - r.row.sell_qty,
                              r.row.buy_amt - r.row.sell_amt, m.vwap(r.row.buy_amt, r.row.buy_qty))
            for r in rows
        ]
        sectors: dict[str, float] = defaultdict(float)
        for s in stocks:
            sectors[s.sector or "OTHERS"] += s.net_amt
        top = sorted((s for s in stocks if s.net_amt > 0), key=lambda s: s.net_amt, reverse=True)[:PROFILE_TOP]
        windows.append(ProfileWindow(label, days, start, top, dict(sorted(sectors.items(), key=lambda kv: -kv[1]))))
    return BrokerProfile(broker_no, windows)


@dataclass
class AccumulationHit:
    symbol: str
    sector: str | None
    top5_share: float
    atr_pct: float
    total_volume: int
    top_brokers: list[int]


async def scan_accumulation(repo: FloorsheetRepository) -> list[AccumulationHit]:
    """Scrips whose top-5 net buyers hold > 35% of volume over the last 10 trading days with ATR% < 4%."""
    start = await repo.window_start(m.ACCUM_DAYS)
    if start is None:
        return []
    by_symbol: dict[str, list] = defaultdict(list)
    sector: dict[str, str | None] = {}
    for r in await repo.broker_rows(start):
        by_symbol[r.symbol].append(r.row)
        sector[r.symbol] = r.sector
    bars = await repo.daily_bars(start)
    hits = []
    for symbol, rows in by_symbol.items():
        ps = m.positions(rows)
        share, atr = m.top_net_share(ps, m.ACCUM_TOP), m.atr_pct(bars.get(symbol, []))
        if m.is_accumulating(share, atr):
            top = sorted(ps, key=lambda p: p.net, reverse=True)[: m.ACCUM_TOP]
            hits.append(AccumulationHit(symbol, sector[symbol], share, atr, m.total_volume(ps), [p.broker for p in top]))
    return sorted(hits, key=lambda h: h.top5_share, reverse=True)


def detect_whales(trades: Iterable[m.Trade]) -> list[dict]:
    """Whale events in the `whale` pub/sub shape from docs/CONTRACTS.md.

    Accepts any objects with Trade's attributes; trade_time may be a datetime or an ISO string.
    """
    return [
        {
            "contract_no": t.contract_no,
            "symbol": t.symbol,
            "buyer_broker": t.buyer_broker,
            "seller_broker": t.seller_broker,
            "qty": t.qty,
            "rate": float(t.rate),
            "amount": float(t.amount),
            "trade_time": t.trade_time.astimezone(NPT).isoformat()
            if isinstance(t.trade_time, datetime) else t.trade_time,
        }
        for t in trades
        if m.is_whale(t)
    ]


async def latest_whales(repo: FloorsheetRepository, symbol: str | None = None, limit: int = 50) -> list[dict]:
    return detect_whales(await repo.recent_whales(symbol, limit))
