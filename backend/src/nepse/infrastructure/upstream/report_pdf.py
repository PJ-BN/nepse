"""Quarterly-report PDF -> common metrics + sector_metrics keys (labels as NEPSE filings print them)."""
import re
from dataclasses import dataclass, field
from io import BytesIO

import pdfplumber

# (field, label regex). First "label ... number" match wins; the number may be negative or in (brackets).
_COMMON = {
    "eps": r"earnings per share|\beps\b",
    "bvps": r"net worth per share|book value per share|\bbvps\b",
    "net_profit": r"net profit(?: after tax)?|profit for the (?:period|year)",
    "total_assets": r"total assets",
    "total_debt": r"total (?:borrowings?|debt)",
    "cash": r"cash (?:and|&) (?:cash equivalents?|bank balance)",
    "distributable_profit": r"distributable profit",
    "reserves": r"total reserves|reserves? (?:and|&) surplus",
    "paid_up_capital": r"paid[- ]?up capital",
}
_SECTOR = {
    "npl_pct": r"non[- ]performing loans?(?: ratio)?|\bnpl\b", "car_pct": r"capital adequacy(?: ratio)?|\bcar\b",
    "cd_ratio_pct": r"credit to deposit(?: ratio)?|\bcd ratio\b", "base_rate_pct": r"base rate",
    "cost_of_funds_pct": r"cost of funds", "interest_spread_pct": r"interest spread",
    "distributable_eps": r"distributable eps", "loan_loss_provision": r"loan loss provision",
    "installed_capacity_mw": r"installed capacity", "total_project_cost": r"total project cost",
    "solvency_margin": r"solvency (?:margin|ratio)", "claim_settlement_ratio": r"claim settlement ratio",
    "gross_premium": r"gross (?:written )?premium", "net_premium": r"net premium", "life_fund_amount": r"life fund",
    "weekly_nav": r"weekly nav", "monthly_nav": r"monthly nav",
}
_NUM = r"\(?-?[\d,]+(?:\.\d+)?\)?"
_PERIOD = re.compile(r"(\d{4}/\d{2,3}).*?\b(first|second|third|fourth|1st|2nd|3rd|4th|q[1-4])\b", re.I | re.S)
_QUARTERS = {"first": 1, "1st": 1, "q1": 1, "second": 2, "2nd": 2, "q2": 2,
             "third": 3, "3rd": 3, "q3": 3, "fourth": 4, "4th": 4, "q4": 4}


@dataclass
class ParsedReport:
    fy_bs: str | None = None
    quarter: int | None = None
    common: dict[str, float] = field(default_factory=dict)
    sector_metrics: dict[str, float] = field(default_factory=dict)


def _number(s: str) -> float:
    neg = s.startswith("(") or s.startswith("-")
    v = float(s.strip("()-").replace(",", ""))
    return -v if neg else v


def _extract(text: str, labels: dict[str, str]) -> dict[str, float]:
    out = {}
    for key, label in labels.items():
        m = re.search(rf"(?:{label})[^\n\d(-]*({_NUM})", text, re.I)
        if m:
            out[key] = _number(m.group(1))
    return out


def parse_report_text(text: str) -> ParsedReport:
    report = ParsedReport(common=_extract(text, _COMMON), sector_metrics=_extract(text, _SECTOR))
    if m := _PERIOD.search(text):
        report.fy_bs, report.quarter = m.group(1), _QUARTERS[m.group(2).lower()]
    return report


def parse_report_pdf(data: bytes) -> ParsedReport:
    with pdfplumber.open(BytesIO(data)) as pdf:
        return parse_report_text("\n".join(page.extract_text() or "" for page in pdf.pages))
