"""MACD, Bollinger, stochastic, ADX, ROC, highest/lowest and OBV against hand-computed values."""
import pytest

from nepse.domain.technicals.indicators import adx, bollinger, highest, lowest, macd, obv, roc, stochastic

N = None


def test_macd_small_periods():
    # EMA2 of 1,2,3,4,5,7 -> 1.5, 2.5, 3.5, 4.5, 6.1667; EMA3 -> 2, 3, 4, 5.5; line = difference
    line, sig, hist = macd([1, 2, 3, 4, 5, 7], fast=2, slow=3, signal=2)
    assert line == [N, N, pytest.approx(0.5), pytest.approx(0.5), pytest.approx(0.5), pytest.approx(2 / 3)]
    assert sig == [N, N, N, pytest.approx(0.5), pytest.approx(0.5), pytest.approx(0.5 * 1 / 3 + 2 / 3 * 2 / 3)]
    assert hist == [N, N, N, pytest.approx(0), pytest.approx(0), pytest.approx(2 / 3 - (1 / 6 + 4 / 9))]


def test_bollinger():
    mid, up, lo = bollinger([1, 2, 3], n=3, k=2)
    sd = (2 / 3) ** 0.5  # population standard deviation
    assert mid == [N, N, 2] and up[:2] == lo[:2] == [N, N]
    assert up[2] == pytest.approx(2 + 2 * sd) and lo[2] == pytest.approx(2 - 2 * sd)


def test_highest_lowest():
    assert highest([1, 3, 2, 5], 2) == [N, 3, 3, 5]
    assert lowest([1, 3, 2, 5], 2) == [N, 1, 2, 2]


def test_stochastic():
    k, d = stochastic([2, 3, 4, 5], [1, 1, 2, 3], [1.5, 2, 3, 4.5], k=3, d=2)
    assert k == [N, N, pytest.approx(100 * 2 / 3), pytest.approx(87.5)]
    assert d == [N, N, N, pytest.approx((100 * 2 / 3 + 87.5) / 2)]
    assert stochastic([5, 5, 5], [5, 5, 5], [5, 5, 5], k=2, d=1)[0] == [N, 50, 50]  # flat range


def test_adx_wilder_n2():
    # +DM 1,1,0  -DM 0,0,1  TR 1.5 each -> +DI/-DI 66.67/0 on bar 2 (DX 100) and 33.33/33.33 on bar 3 (DX 0)
    a, plus, minus = adx([10, 11, 12, 11], [9, 10, 11, 10], [9.5, 10.5, 11.5, 10.5], n=2)
    assert plus == [N, N, pytest.approx(200 / 3), pytest.approx(100 / 3)]
    assert minus == [N, N, 0, pytest.approx(100 / 3)]
    assert a == [N, N, N, pytest.approx(50)]  # mean of DX 100 and 0
    assert adx([1, 2], [1, 2], [1, 2], n=2) == ([N, N], [N, N], [N, N])  # too short


def test_roc_and_obv():
    assert roc([100, 110, 99], 1) == [N, pytest.approx(10), pytest.approx(-10)]
    assert obv([10, 11, 10, 10, 12], [5, 3, 4, 2, 7]) == [0, 3, -1, -1, 6]
