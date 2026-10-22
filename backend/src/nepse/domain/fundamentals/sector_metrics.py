"""Sector-specific fundamentals stored in quarterly_financials.sector_metrics (JSONB).

The only domain module allowed to use pydantic (see docs/CONTRACTS.md). Every key is optional because filings
publish different subsets each quarter; unknown keys are rejected so typos never reach the database.
"""
from datetime import date

from pydantic import BaseModel, ConfigDict


class _Metrics(BaseModel):
    model_config = ConfigDict(extra="forbid")


class BFIMetrics(_Metrics):
    npl_pct: float | None = None
    cost_of_funds_pct: float | None = None
    base_rate_pct: float | None = None
    interest_spread_pct: float | None = None
    cd_ratio_pct: float | None = None
    car_pct: float | None = None
    distributable_eps: float | None = None
    loan_loss_provision: float | None = None


class HydroMetrics(_Metrics):
    installed_capacity_mw: float | None = None
    total_project_cost: float | None = None
    cost_per_mw: float | None = None
    debt_to_equity: float | None = None
    ppa_wet_rate: float | None = None
    ppa_dry_rate: float | None = None
    cod_date: date | None = None
    promoter_lockin_expiry: date | None = None
    royalty_expense: float | None = None


class InsuranceMetrics(_Metrics):
    life_fund_amount: float | None = None
    gross_premium: float | None = None
    net_premium: float | None = None
    claim_settlement_ratio: float | None = None
    solvency_margin: float | None = None
    unearned_premium_reserve: float | None = None
    investment_income: float | None = None
    actuarial_bonus_rate: float | None = None


class ManufacturingMetrics(_Metrics):
    """Manufacturing, hotels and trading."""
    operating_margin_pct: float | None = None
    ebitda: float | None = None
    inventory_turnover: float | None = None
    receivables_days: float | None = None
    capacity_utilization_pct: float | None = None
    free_cash_flow: float | None = None


class Holding(_Metrics):
    symbol: str
    pct: float


class MutualFundMetrics(_Metrics):
    weekly_nav: float | None = None
    monthly_nav: float | None = None
    equity_holding_pct: float | None = None
    fixed_deposit_pct: float | None = None
    cash_balance_pct: float | None = None
    maturity_date: date | None = None
    top_10_holdings: list[Holding] | None = None


SCHEMA_BY_SECTOR: dict[str, type[_Metrics]] = {
    "BANKING": BFIMetrics, "DEVBANK": BFIMetrics, "FINANCE": BFIMetrics, "MICROFIN": BFIMetrics,
    "HYDRO": HydroMetrics,
    "LIFEINSU": InsuranceMetrics, "NONLIFE": InsuranceMetrics,
    "MANUFAC": ManufacturingMetrics, "HOTEL": ManufacturingMetrics, "TRADING": ManufacturingMetrics,
    "MUTUAL": MutualFundMetrics,
}


# Lower-cased sector names as MeroLagani / NepaliPaisa print them -> sector code.
_SECTOR_NAMES = {
    "commercial banks": "BANKING", "development bank limited": "DEVBANK", "development banks": "DEVBANK",
    "finance": "FINANCE", "microfinance": "MICROFIN", "life insurance": "LIFEINSU",
    "non-life insurance": "NONLIFE", "non life insurance": "NONLIFE", "hydro power": "HYDRO",
    "hydropower": "HYDRO", "manufacturing and processing": "MANUFAC", "manufacturing & processing": "MANUFAC",
    "hotels and tourism": "HOTEL", "hotels & tourism": "HOTEL", "tradings": "TRADING", "trading": "TRADING",
    "investment": "INVEST", "others": "OTHERS", "mutual fund": "MUTUAL",
}


def sector_code_from_name(name: str | None) -> str | None:
    return _SECTOR_NAMES.get((name or "").strip().lower())


def validate_sector_metrics(sector_code: str | None, raw: dict | None) -> dict | None:
    """Validate against the sector's schema and return a JSON-ready dict (None fields dropped).

    Sectors without a schema (INVEST, OTHERS) accept no metrics. Raises pydantic.ValidationError on bad input.
    """
    if not raw:
        return None
    schema = SCHEMA_BY_SECTOR.get(sector_code or "")
    if schema is None:
        raise ValueError(f"sector {sector_code!r} has no sector_metrics schema")
    return schema.model_validate(raw).model_dump(mode="json", exclude_none=True)


def load_sector_metrics(sector_code: str | None, stored: dict | None) -> dict:
    """Stored JSONB -> dict with python types (dates as date) for the valuation rules."""
    schema = SCHEMA_BY_SECTOR.get(sector_code or "")
    if not stored or schema is None:
        return {}
    return schema.model_validate(stored).model_dump(exclude_none=True)
