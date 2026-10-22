from dataclasses import dataclass
from datetime import date
from typing import Protocol

# macro_indicators.indicator values
CD_RATIO = "cd_ratio"                    # % (NRB homepage, daily)
INTERBANK_RATE = "interbank_rate"        # % weighted average LCY (NRB homepage, daily)
DEPOSITS = "deposits_total"              # NPR bn, all BFIs (NRB homepage, daily)
LENDING = "lending_total"                # NPR bn, all BFIs (NRB homepage, daily)
BASE_RATE = "base_rate"                  # % commercial banks (CMEFS table 1, monthly)
FX_RESERVES = "fx_reserves_npr_bn"       # gross FX reserves, NPR bn (CMEFS table 1, monthly)
FX_RESERVES_USD = "fx_reserves_usd_mn"   # gross FX reserves, USD mn (CMEFS table 1, monthly)
EXCESS_LIQUIDITY = "excess_liquidity"    # NPR bn absorbed by NRB this fiscal year to date (CMEFS table 52, monthly)
INDICATORS = (CD_RATIO, INTERBANK_RATE, DEPOSITS, LENDING, BASE_RATE, FX_RESERVES, FX_RESERVES_USD, EXCESS_LIQUIDITY)


@dataclass(frozen=True)
class Observation:
    indicator: str
    obs_date: date
    value: float
    source: str


@dataclass(frozen=True)
class IssueRow:
    """One SEBON issue-list row. Dates are Bikram Sambat strings as published (e.g. '2081/03/26')."""
    company: str
    issue_type: str        # IPO, RIGHT
    stage: str             # PIPELINE, APPROVED
    sector: str | None = None
    units: float | None = None
    amount: float | None = None
    issue_manager: str | None = None
    application_date_bs: str | None = None
    approval_date_bs: str | None = None
    as_of_bs: str | None = None
    source_url: str | None = None


class MacroRepository(Protocol):
    async def upsert_observations(self, rows: list[Observation]) -> int: ...

    async def series(self, indicators: tuple[str, ...], since: date) -> dict[str, list[tuple[date, float]]]:
        """Per indicator, (obs_date, value) oldest first."""
        ...

    async def index_closes(self, codes: tuple[str, ...], since: date) -> dict[str, list[tuple[date, float]]]:
        """Per index code, (trade_date, close) oldest first, from index_daily."""
        ...

    async def upsert_issues(self, rows: list[IssueRow]) -> int: ...

    async def issues(self) -> list[IssueRow]: ...


class NrbSource(Protocol):
    async def fetch(self) -> list[Observation]: ...


class SebonSource(Protocol):
    async def fetch(self) -> list[IssueRow]: ...
