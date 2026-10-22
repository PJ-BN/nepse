import math
from datetime import date

import pytest
from pydantic import ValidationError

from nepse.domain.fundamentals import valuation as v
from nepse.domain.fundamentals.fiscal_year import normalize_fy
from nepse.domain.fundamentals.sector_metrics import (
    SCHEMA_BY_SECTOR,
    BFIMetrics,
    MutualFundMetrics,
    load_sector_metrics,
    sector_code_from_name,
    validate_sector_metrics,
)

TODAY = date(2026, 10, 22)


@pytest.mark.parametrize("text", ["082-083", "2082/2083", "82/83", "FY 82/83", "2082/83", "(FY:082-083, Q:4)"])
def test_normalize_fy(text):
    assert normalize_fy(text) == "2082/83"


def test_normalize_fy_century_rollover():
    assert normalize_fy("2099/2100") == "2099/00"


def test_every_schema_sector_is_a_known_sector():
    assert set(SCHEMA_BY_SECTOR) <= {"BANKING", "DEVBANK", "FINANCE", "MICROFIN", "LIFEINSU", "NONLIFE", "HYDRO",
                                     "MANUFAC", "HOTEL", "TRADING", "INVEST", "OTHERS", "MUTUAL"}
    assert SCHEMA_BY_SECTOR["DEVBANK"] is BFIMetrics and SCHEMA_BY_SECTOR["MUTUAL"] is MutualFundMetrics


def test_sector_code_from_site_names():
    assert sector_code_from_name("Commercial Banks") == "BANKING"
    assert sector_code_from_name(" Hydro Power ") == "HYDRO"
    assert sector_code_from_name("Promotor Share") is None


def test_validate_drops_none_and_serialises_dates():
    out = validate_sector_metrics("HYDRO", {"installed_capacity_mw": 25, "cod_date": "2020-01-15", "ppa_dry_rate": None})
    assert out == {"installed_capacity_mw": 25.0, "cod_date": "2020-01-15"}
    assert load_sector_metrics("HYDRO", out)["cod_date"] == date(2020, 1, 15)


def test_validate_rejects_unknown_keys_and_wrong_sector():
    with pytest.raises(ValidationError):
        validate_sector_metrics("BANKING", {"npl": 3})
    with pytest.raises(ValueError):
        validate_sector_metrics("INVEST", {"npl_pct": 3})
    assert validate_sector_metrics("INVEST", None) is None


def test_mutual_fund_holdings_shape():
    out = validate_sector_metrics("MUTUAL", {"top_10_holdings": [{"symbol": "NABIL", "pct": 4.2}]})
    assert out["top_10_holdings"] == [{"symbol": "NABIL", "pct": 4.2}]


def test_graham_number():
    assert v.graham_number(27.01, 240.27) == pytest.approx(math.sqrt(22.5 * 27.01 * 240.27))
    assert v.graham_number(-1, 100) is None and v.graham_number(10, None) is None


def test_dividend_capacity():
    assert v.dividend_capacity(3e9, 28.4e9) == pytest.approx(0.10563, rel=1e-3)
    assert v.dividend_capacity(1, 0) is None


@pytest.mark.parametrize(("npl", "car", "red"), [(4.6, 13, True), (4.5, 11, False), (2, 10.9, True), (None, None, False)])
def test_bfi_red_flag(npl, car, red):
    assert v.bfi_red_flag(npl, car) is red


def test_hydro_cost_per_mw_and_flag():
    assert v.hydro_cost_per_mw(None, 3.4e9, 20) == 170e6
    assert v.hydro_green_flag(170e6) and not v.hydro_green_flag(180e6) and not v.hydro_green_flag(None)


def test_lockin_countdown_only_inside_90_days():
    assert v.lockin_countdown(date(2027, 1, 20), TODAY) == 90
    assert v.lockin_countdown(date(2027, 1, 21), TODAY) is None
    assert v.lockin_countdown(TODAY, TODAY) == 0
    assert v.lockin_countdown(date(2026, 10, 1), TODAY) is None


def test_price_to_life_fund_and_nia_minimum():
    assert v.price_to_life_fund(30e9, 5e9, 2e9, 20e9) == pytest.approx(30e9 / (5e9 + 2e9 + 3e9))
    assert v.below_nia_paid_up_minimum("LIFEINSU", 4.9e9)
    assert not v.below_nia_paid_up_minimum("NONLIFE", 2.5e9)
    assert not v.below_nia_paid_up_minimum("BANKING", 1)


def test_enterprise_value():
    ev = v.enterprise_value(100, 40, 15)
    assert ev == 125 and v.ev_to_ebitda(ev, 25) == 5 and v.ev_to_ebitda(ev, 0) is None


def test_dcf_matches_hand_computation():
    r = 0.06 + 0.07
    cfs = [100 * 1.05 ** t for t in range(1, 6)]
    expected = sum(cf / (1 + r) ** t for t, cf in enumerate(cfs, 1)) + cfs[-1] * 1.03 / (r - 0.03) / (1 + r) ** 5
    assert v.dcf_value(100, 0.05, 0.06) == pytest.approx(expected)
    assert v.dcf_value(100, 0.05, 0.08) < v.dcf_value(100, 0.05, 0.06)  # higher bond yield, lower value
    with pytest.raises(ValueError):
        v.dcf_value(100, 0.05, 0.0, equity_risk_premium=0.02)


def test_nav_discount_and_flag():
    disc = v.nav_discount_pct(8.0, 10.0)
    assert disc == pytest.approx(-20)
    assert v.mf_discount_flag(disc, date(2027, 6, 1), TODAY)
    assert not v.mf_discount_flag(disc, date(2028, 6, 1), TODAY)  # maturity too far
    assert not v.mf_discount_flag(-10, date(2027, 6, 1), TODAY)  # discount too small


def test_health_flags_per_sector():
    codes = lambda *a, **k: [f.code for f in v.health_flags(*a, today=TODAY, **k)]  # noqa: E731
    assert codes("BANKING", {"npl_pct": 5.1, "car_pct": 12}) == ["BFI_STRESS"]
    assert codes("BANKING", {"npl_pct": 1.1, "car_pct": 12}) == []
    assert codes("HYDRO", {"total_project_cost": 1.5e9, "installed_capacity_mw": 10}) == ["HYDRO_CHEAP_CAPEX"]
    assert codes("LIFEINSU", {}, paid_up_capital=4e9) == ["NIA_PAID_UP_SHORTFALL"]
    assert codes("MUTUAL", {"weekly_nav": 10, "maturity_date": date(2027, 3, 1)}, ltp=8) == ["MF_DISCOUNT_NEAR_MATURITY"]
