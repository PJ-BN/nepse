from datetime import date

import pytest

from nepse.domain.corporate_actions.adjustment import (
    CorporateAction,
    action_factors,
    adjusted_price,
    adjustment_factor,
    cumulative_factors,
)


def test_bonus_plus_right_hand_calculated():
    # P=500, 10% bonus + 20% right at par: (500 + 100*0.2) / (1 + 0.1 + 0.2) = 520 / 1.3 = 400
    assert adjusted_price(500, 0.10, 0.20) == pytest.approx(400)
    assert adjustment_factor(500, 0.10, 0.20) == pytest.approx(0.8)


def test_pure_bonus():
    assert adjusted_price(440, 0.10, 0) == pytest.approx(400)


def test_action_factor_uses_last_close_before_book_closure():
    closes = [(date(2025, 1, 1), 450.0), (date(2025, 1, 2), 500.0), (date(2025, 1, 5), 400.0)]
    acts = [CorporateAction(date(2025, 1, 5), 0.10, 0.20), CorporateAction(date(2024, 1, 1), 0.5)]
    assert action_factors(closes, acts) == pytest.approx([0.8, 1.0])


def test_cumulative_factor_multiplies_all_later_actions():
    d = [date(2025, 1, i) for i in (1, 2, 4, 6)]
    events = [(date(2025, 1, 3), 0.8), (date(2025, 1, 5), 0.5)]
    assert cumulative_factors(d, events) == pytest.approx([0.4, 0.4, 0.5, 1.0])
    # a trade on the book-closure date itself is already ex: not adjusted by that action
    assert cumulative_factors([date(2025, 1, 3)], events) == pytest.approx([0.5])
