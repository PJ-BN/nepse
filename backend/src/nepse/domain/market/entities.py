from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal


@dataclass(frozen=True, slots=True)
class Quote:
    symbol: str
    ltp: float
    open: float
    high: float
    low: float
    prev_close: float
    change: float
    pct_change: float
    volume: int
    turnover: float
    ts: datetime


@dataclass(frozen=True, slots=True)
class IndexTick:
    code: str  # NEPSE, SENSITIVE, FLOAT, SENSFLOAT or a sector code (see indices.py)
    value: float
    change: float
    pct_change: float
    turnover: float | None
    ts: datetime


@dataclass(frozen=True, slots=True)
class DailyBar:
    symbol: str
    trade_date: date
    open: Decimal | None
    high: Decimal
    low: Decimal
    close: Decimal
    prev_close: Decimal | None
    volume: int
    turnover: Decimal
    transactions: int | None


@dataclass(frozen=True, slots=True)
class IndexBar:
    code: str
    trade_date: date
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    turnover: Decimal | None


@dataclass(frozen=True, slots=True)
class FloorsheetTick:
    contract_no: int
    symbol: str
    buyer_broker: int
    seller_broker: int
    qty: int
    rate: Decimal
    amount: Decimal
    trade_time: datetime
    buyer_name: str | None = None
    seller_name: str | None = None


@dataclass(frozen=True, slots=True)
class ListedCompany:
    symbol: str
    name: str
    sector_code: str | None
    instrument_type: str  # EQUITY | MUTUAL_FUND | DEBENTURE
    status: str  # ACTIVE | SUSPENDED
    nepse_id: int | None  # NEPSE security id


@dataclass(frozen=True, slots=True)
class CorporateActionRecord:
    """A bonus/right/cash entitlement as published; price adjustment factors are derived elsewhere."""
    symbol: str
    book_closure_date: date
    fiscal_year_bs: str | None
    bonus_pct: Decimal = Decimal(0)
    right_pct: Decimal = Decimal(0)
    cash_pct: Decimal = Decimal(0)
