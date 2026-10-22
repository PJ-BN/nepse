"""Pure valuation maths and sector health rules (Blueprint Module 07). Amounts are NPR, ratios are plain floats."""
import math
from dataclasses import dataclass
from datetime import date

BFI_NPL_MAX_PCT = 4.5
BFI_CAR_MIN_PCT = 11.0
HYDRO_GOOD_COST_PER_MW = 180_000_000
LOCKIN_WARN_DAYS = 90
LIFE_FUND_WEIGHT = 0.15
NIA_MIN_PAID_UP = {"LIFEINSU": 5_000_000_000, "NONLIFE": 2_500_000_000}
MF_DISCOUNT_FLAG_PCT = 15.0
MF_MATURITY_WINDOW_DAYS = 365
BFI_SECTORS = {"BANKING", "DEVBANK", "FINANCE", "MICROFIN"}


def graham_number(eps: float | None, bvps: float | None) -> float | None:
    """sqrt(22.5 * EPS * BVPS); undefined for losses or negative book value."""
    if not eps or not bvps or eps <= 0 or bvps <= 0:
        return None
    return math.sqrt(22.5 * eps * bvps)


def dividend_capacity(distributable_profit: float | None, paid_up_capital: float | None) -> float | None:
    """Fraction of paid-up capital the distributable profit could pay out (0.12 == 12% dividend)."""
    if distributable_profit is None or not paid_up_capital:
        return None
    return distributable_profit / paid_up_capital


def bfi_red_flag(npl_pct: float | None, car_pct: float | None) -> bool:
    return (npl_pct is not None and npl_pct > BFI_NPL_MAX_PCT) or (car_pct is not None and car_pct < BFI_CAR_MIN_PCT)


def hydro_cost_per_mw(cost_per_mw: float | None, total_project_cost: float | None,
                      installed_capacity_mw: float | None) -> float | None:
    if cost_per_mw is not None:
        return cost_per_mw
    if total_project_cost is not None and installed_capacity_mw:
        return total_project_cost / installed_capacity_mw
    return None


def hydro_green_flag(cost_per_mw: float | None) -> bool:
    return cost_per_mw is not None and cost_per_mw < HYDRO_GOOD_COST_PER_MW


def lockin_countdown(expiry: date | None, today: date) -> int | None:
    """Days left on the promoter lock-in, only within the 90-day warning window (0 on expiry day)."""
    if expiry is None:
        return None
    days = (expiry - today).days
    return days if 0 <= days <= LOCKIN_WARN_DAYS else None


def price_to_life_fund(market_cap: float | None, paid_up_capital: float | None, reserves: float | None,
                       life_fund: float | None) -> float | None:
    """Market cap / (paid-up + reserves + 15% of life fund)."""
    if market_cap is None or paid_up_capital is None:
        return None
    base = paid_up_capital + (reserves or 0) + LIFE_FUND_WEIGHT * (life_fund or 0)
    return market_cap / base if base > 0 else None


def below_nia_paid_up_minimum(sector_code: str, paid_up_capital: float | None) -> bool:
    minimum = NIA_MIN_PAID_UP.get(sector_code)
    return minimum is not None and paid_up_capital is not None and paid_up_capital < minimum


def enterprise_value(market_cap: float | None, total_debt: float | None, cash: float | None) -> float | None:
    if market_cap is None:
        return None
    return market_cap + (total_debt or 0) - (cash or 0)


def ev_to_ebitda(ev: float | None, ebitda: float | None) -> float | None:
    if ev is None or not ebitda or ebitda <= 0:
        return None
    return ev / ebitda


def dcf_value(cash_flow: float, growth: float, risk_free_rate: float, equity_risk_premium: float = 0.07,
              terminal_growth: float = 0.03, years: int = 5) -> float:
    """Present value of `years` of cash flows growing at `growth` plus a Gordon terminal value.

    Discount rate = risk_free_rate (NRB 10-year bond yield) + equity_risk_premium. Rates are fractions.
    """
    r = risk_free_rate + equity_risk_premium
    if r <= terminal_growth:
        raise ValueError("discount rate must exceed terminal growth")
    pv, cf = 0.0, cash_flow
    for t in range(1, years + 1):
        cf *= 1 + growth
        pv += cf / (1 + r) ** t
    terminal = cf * (1 + terminal_growth) / (r - terminal_growth)
    return pv + terminal / (1 + r) ** years


def nav_discount_pct(ltp: float | None, nav: float | None) -> float | None:
    """(LTP - NAV) / NAV * 100; negative means the unit trades below NAV."""
    if ltp is None or not nav:
        return None
    return (ltp - nav) / nav * 100


def mf_discount_flag(discount_pct: float | None, maturity: date | None, today: date) -> bool:
    """Closed-end fund trading >15% below NAV with maturity (NAV redemption) inside 12 months."""
    if discount_pct is None or maturity is None:
        return False
    return -discount_pct > MF_DISCOUNT_FLAG_PCT and 0 <= (maturity - today).days <= MF_MATURITY_WINDOW_DAYS


@dataclass(frozen=True)
class Flag:
    code: str
    level: str  # "red" | "green" | "info"
    message: str


def health_flags(sector_code: str | None, metrics: dict, *, paid_up_capital: float | None = None,
                 ltp: float | None = None, today: date) -> list[Flag]:
    """Sector rules over the latest sector_metrics (keys as in sector_metrics.py; dates as date objects)."""
    flags: list[Flag] = []
    code = sector_code or ""
    if code in BFI_SECTORS and bfi_red_flag(metrics.get("npl_pct"), metrics.get("car_pct")):
        flags.append(Flag("BFI_STRESS", "red",
                          f"NPL {metrics.get('npl_pct')}% / CAR {metrics.get('car_pct')}% "
                          f"breaches NPL>{BFI_NPL_MAX_PCT}% or CAR<{BFI_CAR_MIN_PCT}%"))
    if code == "HYDRO":
        cpm = hydro_cost_per_mw(metrics.get("cost_per_mw"), metrics.get("total_project_cost"),
                                metrics.get("installed_capacity_mw"))
        if hydro_green_flag(cpm):
            flags.append(Flag("HYDRO_CHEAP_CAPEX", "green", f"Cost per MW NPR {cpm / 1e6:.0f}M < 180M"))
    if below_nia_paid_up_minimum(code, paid_up_capital):
        flags.append(Flag("NIA_PAID_UP_SHORTFALL", "red",
                          f"Paid-up below NIA minimum of NPR {NIA_MIN_PAID_UP[code] / 1e9:g}B"))
    if code == "MUTUAL":
        nav = metrics.get("weekly_nav") or metrics.get("monthly_nav")
        disc = nav_discount_pct(ltp, nav)
        if mf_discount_flag(disc, metrics.get("maturity_date"), today):
            flags.append(Flag("MF_DISCOUNT_NEAR_MATURITY", "green",
                              f"Trading {-disc:.1f}% below NAV with maturity within 12 months"))
    return flags
