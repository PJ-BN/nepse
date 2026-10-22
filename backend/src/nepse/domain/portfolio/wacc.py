"""Replay a scrip's transactions into a position: MeroShare-style WACC for display, FIFO lots for tax."""
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from enum import StrEnum

from nepse.domain.portfolio.fees_tax import InvestorType, Lot, SellResult, buy_cost, sell_proceeds

RIGHT_IPO_RATE = Decimal(100)  # face value


class TxnType(StrEnum):
    BUY = "BUY"
    SELL = "SELL"
    BONUS = "BONUS"  # zero cost, lowers WACC
    RIGHT = "RIGHT"  # face value, no brokerage
    IPO = "IPO"  # face value, no brokerage


@dataclass(frozen=True)
class Txn:
    kind: TxnType
    qty: int
    rate: Decimal
    on: date


def acquisition_cost(txn: Txn) -> Decimal:
    if txn.kind is TxnType.BUY:
        return buy_cost(txn.qty, txn.rate, txn.on).total_payable
    if txn.kind is TxnType.BONUS:
        return Decimal(0)
    return txn.qty * txn.rate  # RIGHT / IPO: no brokerage, SEBON or DP


@dataclass
class Position:
    qty: int = 0
    total_cost: Decimal = Decimal(0)  # WACC track: sells remove qty * WACC, never change WACC
    lots: list[Lot] = field(default_factory=list)  # FIFO track for tax
    sells: list[tuple[Txn, SellResult]] = field(default_factory=list)

    @property
    def wacc(self) -> Decimal:
        return self.total_cost / self.qty if self.qty else Decimal(0)

    def apply(self, txn: Txn, investor_type: InvestorType = InvestorType.INDIVIDUAL) -> None:
        if txn.qty <= 0:
            raise ValueError("quantity must be positive")
        if txn.kind is TxnType.SELL:
            result = sell_proceeds(self.lots, txn.qty, txn.rate, txn.on, investor_type)
            self.total_cost -= self.wacc * txn.qty
            self.qty -= txn.qty
            self.lots = list(result.remaining)
            self.sells.append((txn, result))
            return
        cost = acquisition_cost(txn)
        self.qty += txn.qty
        self.total_cost += cost
        self.lots.append(Lot(txn.qty, cost / txn.qty, txn.on))


def replay(txns: list[Txn], investor_type: InvestorType = InvestorType.INDIVIDUAL) -> Position:
    """`txns` must already be in execution order (date, then entry order)."""
    pos = Position()
    for txn in txns:
        pos.apply(txn, investor_type)
    return pos
