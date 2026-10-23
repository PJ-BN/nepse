"""Ports and records for the fundamentals use cases."""
from dataclasses import dataclass, field
from datetime import date
from typing import Protocol


class UpstreamError(Exception):
    """An upstream site was unreachable or returned something the parser did not understand."""


@dataclass
class FinancialSnapshot:
    """Headline numbers a site publishes for the latest reported quarter."""
    symbol: str
    name: str | None
    sector_code: str | None
    fy_bs: str  # '2082/83'
    quarter: int
    eps: float | None
    bvps: float | None
    paid_up_capital: float | None
    listed_shares: float | None
    pe: float | None = None
    market_price: float | None = None
    high_52w: float | None = None
    low_52w: float | None = None


@dataclass
class DividendRecord:
    fy_bs: str
    bonus_pct: float = 0.0
    cash_pct: float = 0.0
    right_ratio: str | None = None
    book_closure_date: date | None = None
    announced_on: date | None = None


@dataclass
class Ownership:
    promoter_shares: int
    public_shares: int
    listed_shares: int


@dataclass
class CompanyRow:
    id: int
    symbol: str
    name: str
    sector_code: str | None
    instrument_type: str
    listed_shares: int | None
    public_shares: int | None
    promoter_shares: int | None
    paid_up_capital: float | None
    listing_date: date | None
    promoter_lockin_expiry: date | None
    nepse_id: int | None = None  # NEPSE security id, needed for market depth


@dataclass
class QuarterRow:
    fy_bs: str
    quarter: int
    period_end: date
    paid_up_capital: float | None = None
    reserves: float | None = None
    net_profit: float | None = None
    eps: float | None = None
    bvps: float | None = None
    total_assets: float | None = None
    total_debt: float | None = None
    cash: float | None = None
    distributable_profit: float | None = None
    sector_metrics: dict | None = field(default=None)


@dataclass
class PriceInfo:
    close: float
    trade_date: date
    high_52w: float | None
    low_52w: float | None


@dataclass
class NavRow:
    nav_date: date
    weekly_nav: float | None
    monthly_nav: float | None
    maturity_date: date | None = None  # the fund's redemption date, as published with the NAV


class SnapshotSource(Protocol):
    async def financial_snapshot(self, symbol: str) -> FinancialSnapshot: ...


class DividendSource(Protocol):
    async def dividends(self, symbol: str) -> list[DividendRecord]: ...


class OwnershipSource(Protocol):
    async def ownership(self, symbol: str) -> Ownership | None: ...


class NavSource(Protocol):
    async def mutual_fund_navs(self) -> list[tuple[str, NavRow]]: ...  # (symbol, nav)


class LiveQuotes(Protocol):
    async def quote(self, symbol: str) -> dict | None: ...


class DepthProvider(Protocol):
    async def depth(self, symbol: str, nepse_id: int) -> dict | None: ...


class FundamentalsRepository(Protocol):
    async def company(self, symbol: str) -> CompanyRow | None: ...
    async def create_company(self, symbol: str, name: str, sector_code: str | None) -> CompanyRow: ...
    async def update_company_shares(self, company_id: int, *, listed: float | None, promoter: int | None,
                                    public: int | None, paid_up_capital: float | None) -> None: ...
    async def upsert_quarter(self, company_id: int, row: QuarterRow) -> None: ...
    async def upsert_dividends(self, company_id: int, rows: list[DividendRecord]) -> int: ...
    async def quarters(self, company_id: int, limit: int) -> list[QuarterRow]: ...
    async def dividends(self, company_id: int) -> list[DividendRecord]: ...
    async def latest_price(self, company_id: int) -> PriceInfo | None: ...
    async def latest_nav(self, company_id: int) -> NavRow | None: ...
    async def upsert_navs(self, company_id: int, rows: list[NavRow]) -> int: ...  # idempotent per (company, nav_date)


@dataclass
class SectorReport:
    """Sector-specific figures from one company's latest quarterly report."""
    fy_bs: str
    quarter: int
    metrics: dict[str, float]


class SectorReportSource(Protocol):
    async def sector_report(self, symbol: str) -> SectorReport | None: ...  # None: no usable table for this company
