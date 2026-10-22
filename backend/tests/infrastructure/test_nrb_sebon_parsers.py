from datetime import date
from pathlib import Path

import pytest

from nepse.application.macro.ports import (
    BASE_RATE, CD_RATIO, DEPOSITS, EXCESS_LIQUIDITY, FX_RESERVES, FX_RESERVES_USD, INTERBANK_RATE, LENDING,
)
from nepse.infrastructure.upstream.nrb import find_cmefs_url, parse_cmefs, parse_homepage
from nepse.infrastructure.upstream.sebon import parse_approved_pdf, parse_list_page, parse_pipeline_pdf

FIX = Path(__file__).parent / "fixtures"


def test_nrb_homepage_indicators():
    obs = {(o.indicator, o.obs_date): o.value for o in parse_homepage((FIX / "nrb_home.html").read_text("utf-8"))}
    assert obs[(CD_RATIO, date(2026, 10, 11))] == 70.79
    assert obs[(CD_RATIO, date(2026, 10, 10))] == 70.84
    assert obs[(INTERBANK_RATE, date(2026, 10, 11))] == 2.75
    assert obs[(DEPOSITS, date(2026, 10, 11))] == 8515
    assert obs[(LENDING, date(2026, 10, 10))] == 6078
    assert len(obs) == 8  # 4 indicators x 2 dates; the per-class deposit/lending rows are ignored
    assert parse_homepage("<html></html>") == []


def test_nrb_finds_cmefs_link():
    url = find_cmefs_url((FIX / "nrb_home.html").read_text("utf-8"))
    assert url.endswith("current-macroeconomic-and-financial-situation-tables-based-on-two-months-data-of-2026-27/")


def test_nrb_cmefs_workbook():
    obs = {o.indicator: o for o in parse_cmefs((FIX / "nrb_cmefs.xlsx").read_bytes())}
    assert {o.obs_date for o in obs.values()} == {date(2026, 9, 15)}  # "Mid-September" of FY 2026/27
    assert obs[BASE_RATE].value == 4.70
    assert obs[FX_RESERVES].value == pytest.approx(4065.78, abs=0.01)
    assert obs[FX_RESERVES_USD].value == pytest.approx(26480.24, abs=0.01)
    assert obs[EXCESS_LIQUIDITY].value == pytest.approx(3764.5)  # NPR 3,764,500 mn absorbed -> bn


def test_sebon_list_page():
    entries = parse_list_page((FIX / "sebon_ipo-pipeline.html").read_text("utf-8"))
    assert entries[0].title == "List of Applications for IPO (2083-06-27)"
    assert entries[0].date == "2026-10-13"
    assert entries[0].pdf_url.endswith("6w6qZ3G7NUs8a0tGuXD7TQM4pcF3SY8DcB5vS3HV.pdf")
    assert len(parse_list_page((FIX / "sebon_ipo-approved.html").read_text("utf-8"))) > 5


def test_sebon_ipo_pipeline_pdf():
    rows = parse_pipeline_pdf((FIX / "sebon_ipo_pipeline.pdf").read_bytes(), "IPO", "u")
    assert len(rows) == 82
    by_name = {r.company: r for r in rows}
    apex = by_name["Apex Hospitality Limited"]  # name wraps around the serial number line
    assert (apex.units, apex.amount, apex.issue_manager, apex.application_date_bs) == (
        2_250_000, 225_000_000, "Himalayan Capital Limited", "2080/06/12")
    assert apex.stage == "PIPELINE" and apex.as_of_bs == "2083/06/27" and apex.source_url == "u"
    assert by_name["Thamel Plaza Hotel and Suites Ltd. [Ramada Encore]"].issue_manager == "Nepal SBI Merchant Banking Ltd."
    assert by_name["Siuri Nyadi Power Limited"].amount == 3_036_078_400
    assert "Liberty Micro Life Insurance" in by_name  # the section "Total" row is not glued onto it
    assert all(r.amount and r.units and r.issue_manager and r.application_date_bs for r in rows)


def test_sebon_right_pipeline_pdf():
    rows = parse_pipeline_pdf((FIX / "sebon_right_pipeline.pdf").read_bytes(), "RIGHT")
    assert len(rows) == 24
    r = rows[1]
    assert (r.company, r.sector, r.units, r.amount, r.issue_manager) == (
        "Sanima GIC Insurance Ltd", "Non-Life Insurance", 3_655_000, 365_500_000, "Citizen Capital Limited")
    assert rows[6].units == 11_732_000  # "1" "1,732,000.00" split across two words


def test_sebon_ipo_approved_pdf():
    [r] = parse_approved_pdf((FIX / "sebon_ipo_approved.pdf").read_bytes(), "IPO")
    assert (r.company, r.sector, r.units, r.amount, r.issue_manager, r.approval_date_bs, r.stage) == (
        "Him Parbat Hydropower Limited", "Hydropower", 5_915_000, 591_500_000, "Citizens Capital Limited",
        "2082/06/20", "APPROVED")
