from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from nepse.application.portfolio.ports import PriceSource, StoredTxn, TxnRepo
from nepse.domain.portfolio.fees_tax import InvestorType, SellResult, TradeFees, buy_cost, money
from nepse.domain.portfolio.wacc import Position, Txn, TxnType, acquisition_cost, replay


class UnknownSymbol(Exception):
    pass


def _by_symbol(txns: list[StoredTxn]) -> dict[str, list[Txn]]:
    out: dict[str, list[Txn]] = {}
    for t in txns:
        out.setdefault(t.symbol, []).append(t.txn)
    return out


def _fee_dict(fees: TradeFees) -> dict:
    return {"amount": fees.amount, "brokerage": fees.brokerage, "sebon_fee": fees.sebon_fee,
            "dp_charge": fees.dp_charge, "total_fees": fees.total}


def sell_dict(r: SellResult) -> dict:
    return {**_fee_dict(r.fees), "cost_basis": r.cost_basis, "cgt": r.cgt,
            "net_receivable": r.net_receivable, "realized_pnl": r.realized_pnl}


def _jsonable(d: dict) -> dict:
    return {k: str(v) for k, v in d.items()}


async def record_txn(
    repo: TxnRepo, user_id: int, symbol: str, txn: Txn, investor_type: InvestorType = InvestorType.INDIVIDUAL,
) -> StoredTxn:
    """Validates the whole scrip history with `txn` inserted (a backdated sell can't oversell later)."""
    symbol = symbol.strip().upper()
    if not await repo.symbol_exists(symbol):
        raise UnknownSymbol(symbol)
    history = _by_symbol(await repo.list_for_user(user_id)).get(symbol, [])
    pos = Position()
    # Insert after every txn on the same date: entry order breaks ties.
    for t in sorted([*history, txn], key=lambda t: t.on):  # sort is stable
        pos.apply(t, investor_type)  # ValueError on oversell
    if txn.kind is TxnType.SELL:
        fees = sell_dict(next(r for t, r in pos.sells if t is txn))
    elif txn.kind is TxnType.BUY:
        c = buy_cost(txn.qty, txn.rate, txn.on)
        fees = {**_fee_dict(c.fees), "total_payable": c.total_payable}
    else:
        fees = {"total_cost": acquisition_cost(txn)}
    fees = _jsonable(fees)
    return StoredTxn(await repo.add(user_id, symbol, txn, fees), symbol, txn, fees)


@dataclass(frozen=True)
class Holding:
    symbol: str
    qty: int
    wacc: Decimal
    total_cost: Decimal
    ltp: Decimal | None
    market_value: Decimal | None
    unrealized_pnl: Decimal | None
    day_change: Decimal | None


async def get_holdings(
    repo: TxnRepo, prices: PriceSource, user_id: int, investor_type: InvestorType = InvestorType.INDIVIDUAL,
) -> list[Holding]:
    positions = {s: replay(t, investor_type) for s, t in _by_symbol(await repo.list_for_user(user_id)).items()}
    positions = {s: p for s, p in positions.items() if p.qty}
    quotes = await prices.quotes(sorted(positions))
    out = []
    for symbol, p in sorted(positions.items()):
        q = quotes.get(symbol)
        value = money(q.ltp * p.qty) if q else None
        out.append(Holding(
            symbol, p.qty, money(p.wacc), money(p.total_cost),
            q.ltp if q else None, value,
            money(value - p.total_cost) if q else None,
            money((q.ltp - q.prev_close) * p.qty) if q and q.prev_close is not None else None,
        ))
    return out


@dataclass(frozen=True)
class RealizedSell:
    symbol: str
    on: date
    qty: int
    rate: Decimal
    result: SellResult


async def get_realized_pnl(
    repo: TxnRepo, user_id: int, investor_type: InvestorType = InvestorType.INDIVIDUAL,
) -> list[RealizedSell]:
    """Every sell with FIFO cost basis; `result.realized_pnl` is net of sell fees and CGT."""
    out = []
    for symbol, txns in _by_symbol(await repo.list_for_user(user_id)).items():
        for txn, result in replay(txns, investor_type).sells:
            out.append(RealizedSell(symbol, txn.on, txn.qty, txn.rate, result))
    return sorted(out, key=lambda r: r.on)
