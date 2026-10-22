import json
from datetime import date
from decimal import Decimal
from pathlib import Path

from nepse.infrastructure.upstream import sharesansar as ss

FIXTURES = Path(__file__).parent / "fixtures" / "sharesansar"


def load(name: str):
    return json.loads((FIXTURES / f"{name}.json").read_text())


def test_page_tokens():
    token, company_id = ss.page_tokens((FIXTURES / "company_page.html").read_text())
    assert token and company_id == 16


def test_price_rows_and_prev_close():
    bars = ss.with_prev_close(ss.price_rows("NABIL", load("price_history")["data"]))
    assert [b.trade_date for b in bars] == [date(2026, 10, 14), date(2026, 10, 15), date(2026, 10, 16)]
    assert bars[0].prev_close is None and bars[1].prev_close == bars[0].close
    assert bars[-1].open == Decimal("548.00") and bars[-1].volume == 30945


def test_dividends():
    actions = ss.dividend_rows("NABIL", load("dividends")["data"])
    first = actions[0]
    assert (first.book_closure_date, first.bonus_pct, first.cash_pct, first.fiscal_year_bs) == (
        date(2026, 9, 30), Decimal("5.00"), Decimal("10.8"), "2082/2083")
    assert actions[2].bonus_pct == 0  # empty bonus_share string


def test_rights_ratio_to_percent():
    actions = ss.right_rows("API", load("rights")["data"])
    assert actions[0].right_pct == Decimal("40") and actions[0].book_closure_date == date(2023, 7, 7)


def test_merge_same_day_bonus_and_right():
    d = date(2024, 1, 1)
    merged = ss.merge_actions([
        ss.CorporateActionRecord("X", d, "2080/81", bonus_pct=Decimal(10)),
        ss.CorporateActionRecord("X", d, None, right_pct=Decimal(50)),
    ])
    assert len(merged) == 1 and (merged[0].bonus_pct, merged[0].right_pct, merged[0].fiscal_year_bs) == (10, 50, "2080/81")
