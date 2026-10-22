from datetime import date
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from nepse.domain.calendar.npt import now_npt
from nepse.domain.portfolio.fees_tax import InvestorType
from nepse.domain.portfolio.wacc import RIGHT_IPO_RATE, TxnType

Qty = Annotated[int, Field(gt=0, le=100_000_000)]
Rate = Annotated[Decimal, Field(ge=0, le=10_000_000, max_digits=12, decimal_places=2)]
Symbol = Annotated[str, Field(min_length=1, max_length=20, pattern=r"^\s*[A-Za-z0-9]+\s*$")]


def _not_future(d: date) -> date:
    if d > now_npt().date():
        raise ValueError("date cannot be in the future")
    return d


class TxnIn(BaseModel):
    symbol: Symbol
    txn_type: TxnType
    qty: Qty
    rate: Rate | None = None  # omitted: 100 for RIGHT/IPO, 0 for BONUS; required for BUY/SELL
    txn_date: date
    investor_type: InvestorType = InvestorType.INDIVIDUAL

    _date = field_validator("txn_date")(_not_future)

    @model_validator(mode="after")
    def _default_rate(self):
        if self.txn_type is TxnType.BONUS:
            self.rate = Decimal(0)
        elif self.rate is None:
            if self.txn_type in (TxnType.BUY, TxnType.SELL):
                raise ValueError("rate is required for BUY and SELL")
            self.rate = RIGHT_IPO_RATE
        if self.txn_type in (TxnType.BUY, TxnType.SELL) and self.rate <= 0:
            raise ValueError("rate must be positive")
        return self


class TxnOut(BaseModel):
    id: int
    symbol: str
    txn_type: TxnType
    qty: int
    rate: Decimal
    txn_date: date
    fees: dict


class HoldingOut(BaseModel):
    symbol: str
    qty: int
    wacc: Decimal
    total_cost: Decimal
    ltp: Decimal | None
    market_value: Decimal | None
    unrealized_pnl: Decimal | None
    day_change: Decimal | None


class RealizedOut(BaseModel):
    symbol: str
    sell_date: date
    qty: int
    rate: Decimal
    amount: Decimal
    total_fees: Decimal
    cost_basis: Decimal
    cgt: Decimal
    net_receivable: Decimal
    realized_pnl: Decimal


class RealizedSummaryOut(BaseModel):
    total_realized_pnl: Decimal
    total_cgt: Decimal
    sells: list[RealizedOut]


class CalcIn(BaseModel):
    side: Literal["BUY", "SELL"]
    qty: Qty
    rate: Decimal = Field(gt=0, le=10_000_000, max_digits=12, decimal_places=2)
    # SELL only: what the shares cost (fees are added as for a market buy) and when they were bought.
    buy_rate: Rate | None = None
    buy_date: date | None = None
    sell_date: date | None = None  # defaults to today
    investor_type: InvestorType = InvestorType.INDIVIDUAL

    @field_validator("buy_date", "sell_date")
    @classmethod
    def _dates(cls, d: date | None) -> date | None:
        return d and _not_future(d)

    @model_validator(mode="after")
    def _sell_needs_basis(self):
        if self.side == "SELL" and (self.buy_rate is None or self.buy_date is None):
            raise ValueError("SELL needs buy_rate and buy_date")
        if self.sell_date and self.buy_date and self.buy_date > self.sell_date:
            raise ValueError("buy_date is after sell_date")
        return self
