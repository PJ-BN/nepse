"""Parsers against real responses captured 2026-10-22 (see fixtures/)."""
import json
from datetime import date
from pathlib import Path

from nepse.infrastructure.upstream import merolagani, nepalipaisa

FIX = Path(__file__).parent / "fixtures"


def _text(name: str) -> str:
    return (FIX / name).read_text(encoding="utf-8")


def test_merolagani_company_detail():
    s = merolagani.parse_company_detail(_text("merolagani_company_NABIL.html"), "NABIL")
    assert (s.name, s.sector_code, s.fy_bs, s.quarter) == ("Nabil Bank Limited", "BANKING", "2082/83", 4)
    assert (s.eps, s.pe, s.bvps) == (27.01, 20.25, 240.27)
    assert (s.high_52w, s.low_52w, s.market_price) == (581.0, 485.0, 547.0)
    assert s.paid_up_capital == 28_409_846_850.0 and s.listed_shares == 284_098_468.5


def test_merolagani_viewstate_fields():
    form = merolagani.hidden_fields(_text("merolagani_company_NABIL.html"))
    assert form["__VIEWSTATE"] and form["__EVENTVALIDATION"] and form["__VIEWSTATEGENERATOR"] == "982A0BEA"
    assert form["ctl00$ContentPlaceHolder1$CompanyDetail1$hdnStockSymbol"] == "NABIL"


def test_merolagani_dividend_tab_postback_response():
    rows = merolagani.parse_dividend_tab(_text("merolagani_dividend_tab_NABIL.html"))
    assert len(rows) == 10  # first page of the tab
    first = rows[0]
    assert (first.fy_bs, first.cash_pct, first.bonus_pct, first.right_ratio) == ("2082/83", 10.8, 5.0, None)
    assert rows[1].fy_bs == "2081/82" and rows[1].bonus_pct == 0.0


def test_nepalipaisa_company_page():
    s = nepalipaisa.parse_company_page(_text("nepalipaisa_company_NABIL.html"), "NABIL")
    assert (s.name, s.sector_code, s.fy_bs, s.quarter) == ("Nabil Bank Limited", "BANKING", "2082/83", 4)
    assert (s.eps, s.bvps, s.pe) == (24.66, 224.31, 22.18)
    assert s.paid_up_capital == 28_409_848_300.0 and s.listed_shares == 284_098_483
    assert (s.low_52w, s.high_52w) == (485.0, 581.0)


def test_nepalipaisa_dividends_json():
    rows = nepalipaisa.parse_dividends(json.loads(_text("nepalipaisa_dividends_NABIL.json")))
    first = rows[0]
    assert (first.fy_bs, first.bonus_pct, first.cash_pct) == ("2082/83", 5.0, 10.8)
    assert first.book_closure_date == date(2026, 9, 30)
    assert all(r.fy_bs[4] == "/" for r in rows)


def test_nepalipaisa_ownership_json():
    o = nepalipaisa.parse_ownership(json.loads(_text("nepalipaisa_ownership_NABIL.json")))
    assert (o.promoter_shares, o.public_shares, o.listed_shares) == (158_121_099, 112_448_885, 284_098_483)
