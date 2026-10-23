"""Rule parsing/evaluation and forward-return maths on tiny fixed series."""
import pytest

from nepse.domain.simulation.forward import forward
from nepse.domain.simulation.rules import MAX_NODES, Candles, RuleError, evaluate, parse


def candles(closes, highs=None, lows=None, volume=None):
    return Candles(list(closes), list(highs or closes), list(lows or closes), list(closes), list(volume or [1] * len(closes)))


def cond(left, op, right):
    return {"left": left, "op": op, "right": right}


CLOSE = {"ind": "close"}


def fired(rule, closes):
    return evaluate(parse(rule), candles(closes)).fired


def test_comparison_truth_table():
    c = [1, 2, 3]
    assert fired(cond(CLOSE, ">", 2), c) == [False, False, True]
    assert fired(cond(CLOSE, ">=", 2), c) == [False, True, True]
    assert fired(cond(CLOSE, "<", 2), c) == [True, False, False]
    assert fired(cond(CLOSE, "<=", 2), c) == [True, True, False]


def test_warmup_is_false():
    assert fired(cond({"ind": "sma", "n": 3}, ">", 0), [1, 2, 3, 4]) == [False, False, True, True]


def test_crosses_need_the_previous_bar():
    closes = [1, 3, 3, 1, 3]
    assert fired(cond(CLOSE, "crosses_above", 2), closes) == [False, True, False, False, True]
    assert fired(cond(CLOSE, "crosses_below", 2), closes) == [False, False, False, True, False]
    # touching without exceeding is not a cross; leaving from equality is
    assert fired(cond(CLOSE, "crosses_above", 2), [2, 2, 3]) == [False, False, True]
    assert fired(cond(CLOSE, "crosses_above", 2), [1, 2, 2]) == [False, False, False]


def test_and_or_nesting():
    big, mid = cond(CLOSE, ">", 1), cond(CLOSE, "<", 3)
    c = [0, 1, 2, 3, 4]
    assert fired({"and": [big, mid]}, c) == [False, False, True, False, False]
    assert fired({"or": [cond(CLOSE, "<", 1), cond(CLOSE, ">", 3)]}, c) == [True, False, False, False, True]
    nested = {"and": [big, {"or": [cond(CLOSE, "<", 2), cond(CLOSE, ">", 3)]}]}
    assert fired(nested, c) == [False, False, False, False, True]


def test_evaluation_exposes_each_condition_and_indicator_once():
    ev = evaluate(parse({"and": [cond({"ind": "sma", "n": 2}, ">", 1), cond({"ind": "sma", "n": 2}, "<", 9)]}),
                  candles([1, 2, 3]))
    assert [t for _, t in ev.conditions] == [[False, True, True], [False, True, True]]
    assert len(ev.series) == 3  # sma(2), 1, 9


def test_signal_never_depends_on_later_bars():
    rule = parse({"or": [cond({"ind": "rsi", "n": 3}, "<", 40), cond({"ind": "macd.hist", "fast": 2, "slow": 3, "signal": 2}, ">", 0)]})
    closes = [5, 6, 4, 3, 5, 7, 6, 2, 3, 8]
    full = evaluate(rule, candles(closes)).fired
    for n in range(1, len(closes)):
        assert evaluate(rule, candles(closes[:n])).fired == full[:n]


@pytest.mark.parametrize("rule", [
    [], "x", {"left": 1}, {"and": []}, {"and": [cond(CLOSE, ">", 1)], "or": []},
    cond(CLOSE, "; DROP", 1), cond({"ind": "nope"}, ">", 1), cond({"ind": "rsi", "n": 0}, ">", 1),
    cond({"ind": "rsi", "n": 401}, ">", 1), cond({"ind": "rsi", "n": 1.5}, ">", 1), cond({"ind": "rsi", "x": 1}, ">", 1),
    cond({"ind": "rsi", "n": True}, ">", 1), cond(CLOSE, ">", True), cond(CLOSE, ">", float("inf")), cond(CLOSE, ">", "3"),
    cond({"ind": "close", "n": 3}, ">", 1), cond({"ind": "bb.upper", "k": 99}, ">", 1),
])
def test_invalid_rules(rule):
    with pytest.raises(RuleError):
        parse(rule)


def test_size_limits():
    deep = cond(CLOSE, ">", 1)
    for _ in range(6):
        deep = {"and": [deep]}
    with pytest.raises(RuleError):
        parse(deep)  # 7 levels
    with pytest.raises(RuleError):
        parse({"and": [cond(CLOSE, ">", 1)] * MAX_NODES})


# ---- forward ----
#           bar:  0   1   2   3   4   5
CLOSES = [10, 10, 11, 12, 9, 10]
HIGHS = [11, 11, 12, 13, 10, 11]
LOWS = [9, 9, 10, 11, 8, 9]


def test_forward_returns_and_excursions():
    f = forward(candles(CLOSES, HIGHS, LOWS), 0, [1, 2, 4, 5])
    assert f.entry == 1 and f.entry_price == 10  # signal bar 0 enters at bar 1's close
    got = {r.horizon: (r.ret, r.mfe, r.mae) for r in f.results}
    assert got == {1: (pytest.approx(10), pytest.approx(20), 0), 2: (pytest.approx(20), pytest.approx(30), 0),
                   4: (pytest.approx(0), pytest.approx(30), pytest.approx(-20))}  # horizon 5 runs past the data
    assert f.path == [pytest.approx(10), pytest.approx(20), pytest.approx(-10), pytest.approx(0)]
    assert f.bracket is None


def test_forward_cost_applies_to_returns_only():
    r = forward(candles(CLOSES, HIGHS, LOWS), 0, [1], cost_pct=1.0).results[0]
    assert (r.ret, r.mfe) == (pytest.approx(9), pytest.approx(20))


def test_forward_needs_a_next_bar():
    assert forward(candles(CLOSES), 5, [1]) is None
    assert forward(candles(CLOSES), 4, [1]).results == []  # entry exists, no bar after it


def test_bracket_target_stop_neither_open():
    c = candles(CLOSES, HIGHS, LOWS)
    hit = forward(c, 0, [4], target_pct=15, stop_pct=10).bracket  # bar 2 high 12 >= 11.5, low 10 > 9
    assert (hit.outcome, hit.bars, hit.ret) == ("target", 1, 15)
    stop = forward(c, 0, [4], target_pct=50, stop_pct=15).bracket  # bar 5 never; bar 4 low 8 <= 8.5
    assert (stop.outcome, stop.bars, stop.ret) == ("stop", 3, -15)
    assert forward(c, 0, [4], target_pct=50, stop_pct=50).bracket.outcome == "neither"
    assert forward(c, 0, [5], target_pct=50, stop_pct=50).bracket.outcome == "open"  # window not fully observed
    assert forward(c, 0, [4], target_pct=15, stop_pct=10, cost_pct=1).bracket.ret == 14


def test_bracket_bar_touching_both_counts_as_stop():
    c = candles([10, 10, 10], highs=[10, 10, 11], lows=[10, 10, 9])
    b = forward(c, 0, [1], target_pct=5, stop_pct=5).bracket
    assert (b.outcome, b.bars, b.ret) == ("stop", 1, -5)
