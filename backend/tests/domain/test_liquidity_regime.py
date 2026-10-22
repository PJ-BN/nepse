from datetime import date

import pytest

from nepse.domain.macro.liquidity_regime import Regime, classify, liquidity_regime, score, value_on_or_before


def test_classify_levels():
    assert classify(70.8, 2.75) is Regime.BULLISH
    assert classify(82.0, 2.75) is Regime.NEUTRAL  # boundary is strict
    assert classify(80.0, 3.5) is Regime.NEUTRAL
    assert classify(89.0, 2.0) is Regime.BEARISH
    assert classify(75.0, 6.5) is Regime.BEARISH


def test_score_bounds_and_direction():
    assert score(0, 0) == 50
    assert score(None, None) == 50
    assert score(-10, -100) == 100  # both falling fast, saturated
    assert score(10, 100) == 0
    assert score(-1.25, 0) == pytest.approx(62.5)
    assert score(0, 12.5) == pytest.approx(37.5)


def test_value_on_or_before():
    s = [(date(2026, 1, 1), 1.0), (date(2026, 1, 10), 2.0)]
    assert value_on_or_before(s, date(2025, 12, 31)) is None
    assert value_on_or_before(s, date(2026, 1, 9)) == 1.0
    assert value_on_or_before(s, date(2026, 1, 10)) == 2.0


def test_liquidity_regime_end_to_end():
    cd = [(date(2026, 9, 1), 72.0), (date(2026, 9, 20), 71.5), (date(2026, 10, 11), 70.2)]
    ib = [(date(2026, 9, 5), 3.0), (date(2026, 10, 11), 2.75)]
    r = liquidity_regime(cd, ib)
    assert r.regime is Regime.BULLISH
    # 30 days before 10-11 is 09-11: CD then = 72.0 (09-01 obs), interbank = 3.0 (09-05 obs)
    assert r.cd_roc_30d == pytest.approx(100 * (70.2 / 72 - 1))
    assert r.interbank_roc_30d == pytest.approx(100 * (2.75 / 3 - 1))
    assert r.score == round(score(r.cd_roc_30d, r.interbank_roc_30d), 1)
    assert 50 < r.score <= 100
    assert liquidity_regime([], ib) is None
