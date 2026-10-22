from datetime import date, timedelta

import pytest

from nepse.domain.technicals.breadth import advance_decline, mcclellan_oscillator, pct_above_sma
from nepse.domain.technicals.indicators import atr, atr_pct, ema, rsi, sma, true_range
from nepse.domain.technicals.rrg import Quadrant, compute_rrg, quadrant, rs_lines, to_weekly


def test_sma_and_ema():
    assert sma([1, 2, 3, 4, 5], 3) == [None, None, 2, 3, 4]
    e = ema([1, 2, 3, 4, 5], 3)
    assert e[:2] == [None, None] and e[2] == 2 and e[3] == pytest.approx(3) and e[4] == pytest.approx(4)
    assert ema([1, 2], 3) == [None, None]


def test_rsi_wilder_reference():
    # The widely quoted StockCharts RSI table. It prints 70.53 / 66.32 from unrounded closes; with the
    # 2-decimal closes below Wilder smoothing gives 70.46 / 66.25.
    closes = [44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61,
              46.28, 46.28, 46.00, 46.03, 46.41, 46.22, 45.64]
    r = rsi(closes)
    assert r[13] is None
    assert r[14] == pytest.approx(70.46, abs=0.01)
    assert r[15] == pytest.approx(66.25, abs=0.01)


def test_rsi_edges():
    assert rsi(list(range(1, 20)))[-1] == 100.0  # only gains
    assert rsi([float(x) for x in range(20, 1, -1)])[-1] == 0.0
    # Cutler: plain mean of the last 14 gains/losses
    closes = [10, 11, 10, 11, 10, 11, 10, 11, 10, 11, 10, 11, 10, 11, 10, 12]
    assert rsi(closes, wilder=False)[-1] == pytest.approx(100 - 100 / (1 + (7 + 1) / 7))


def test_atr():
    h, lo, c = [10, 12, 11], [9, 10, 8], [9.5, 11, 9]
    assert true_range(h, lo, c) == [1, 2.5, 3]  # bar 2: gap from prev close 9.5 to high 12
    assert atr(h, lo, c, n=2) == [None, 1.75, pytest.approx(2.375)]
    assert atr(h, lo, c, n=2, wilder=False) == [None, 1.75, 2.75]
    assert atr_pct(h, lo, c, n=2, wilder=False)[-1] == pytest.approx(2.75 / 9 * 100)


def test_advance_decline_and_mcclellan():
    ad = advance_decline([1, -2, 0, 3, 0.5, -0.1])
    assert (ad.advances, ad.declines, ad.unchanged, ad.net) == (3, 2, 1, 1)
    flat = mcclellan_oscillator([10.0] * 50)
    assert flat[37] is None and flat[38] == pytest.approx(0) and flat[-1] == pytest.approx(0)
    rising = mcclellan_oscillator([float(i) for i in range(60)])
    assert rising[-1] > 0  # the fast EMA leads in an uptrend


def test_pct_above_sma():
    data = {"A": [1, 2, 3], "B": [3, 2, 1], "C": [5]}  # C has too little history
    assert pct_above_sma(data, 3) == 50
    assert pct_above_sma({"C": [1]}, 3) is None


def test_quadrants():
    assert quadrant(101, 101) is Quadrant.LEADING
    assert quadrant(101, 99) is Quadrant.WEAKENING
    assert quadrant(99, 99) is Quadrant.LAGGING
    assert quadrant(99, 101) is Quadrant.IMPROVING


def _days(n: int):
    start = date(2026, 1, 5)  # a Monday
    return [start + timedelta(days=i) for i in range(n)]


def test_rrg_outperformer_leads_and_underperformer_lags():
    # Flat relative strength, then a breakout (or breakdown) on the last bar: ratio and momentum both jump.
    days = _days(41)
    bench = [(d, 2000.0) for d in days]
    up = [(d, 100.0 if i < 40 else 110.0) for i, d in enumerate(days)]
    down = [(d, 100.0 if i < 40 else 90.0) for i, d in enumerate(days)]
    res = {t.code: t for t in compute_rrg({"HYDRO": up, "BANKING": down}, bench, window=10, tail=5)}
    assert res["HYDRO"].quadrant is Quadrant.LEADING
    assert res["BANKING"].quadrant is Quadrant.LAGGING
    assert len(res["HYDRO"].tail) == 5 and res["HYDRO"].tail[-1].day == days[-1]


def test_rrg_flat_relative_strength_sits_at_centre():
    lines = rs_lines([100.0] * 30, [50.0] * 30, 10)
    assert lines[:19] == [None] * 19  # ratio needs 10 bars, momentum 10 more ratios (ROC loses one)
    assert lines[-1] == (100.0, 100.0)


def test_rrg_weekly_resample_and_short_history():
    days = _days(14)
    weekly = to_weekly([(d, float(i)) for i, d in enumerate(days)])
    # days[0] is Monday; weeks run Sunday-Saturday, so Saturday days[5] and days[12] close weeks
    assert weekly == [(days[5], 5.0), (days[12], 12.0), (days[13], 13.0)]
    assert compute_rrg({"X": [(d, 1.0) for d in days]}, [(d, 1.0) for d in days], weekly=True) == []
