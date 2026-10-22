"""Classic price indicators over plain float lists (oldest first).

Every function returns a list the same length as its input, with None until enough history exists,
so results line up index-for-index with the bars they came from.
"""
from collections.abc import Sequence

Series = list[float | None]


def sma(values: Sequence[float], n: int) -> Series:
    out: Series = [None] * len(values)
    total = 0.0
    for i, v in enumerate(values):
        total += v
        if i >= n:
            total -= values[i - n]
        if i >= n - 1:
            out[i] = total / n
    return out


def ema(values: Sequence[float], n: int) -> Series:
    """EMA with alpha 2/(n+1), seeded with the SMA of the first n values."""
    out: Series = [None] * len(values)
    if len(values) < n:
        return out
    k = 2 / (n + 1)
    prev = sum(values[:n]) / n
    out[n - 1] = prev
    for i in range(n, len(values)):
        prev = values[i] * k + prev * (1 - k)
        out[i] = prev
    return out


def _smooth(values: Sequence[float], n: int, wilder: bool) -> Series:
    """Wilder's RMA (alpha 1/n, seeded with the first n-value mean) or a plain n-period SMA."""
    if not wilder:
        return sma(values, n)
    out: Series = [None] * len(values)
    if len(values) < n:
        return out
    prev = sum(values[:n]) / n
    out[n - 1] = prev
    for i in range(n, len(values)):
        prev = (prev * (n - 1) + values[i]) / n
        out[i] = prev
    return out


def rsi(closes: Sequence[float], n: int = 14, wilder: bool = True) -> Series:
    """RSI. wilder=False is Cutler's SMA variant, which is what mv_screener_snapshot computes in SQL."""
    out: Series = [None] * len(closes)
    if len(closes) <= n:
        return out
    deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    gains = _smooth([max(d, 0.0) for d in deltas], n, wilder)
    losses = _smooth([max(-d, 0.0) for d in deltas], n, wilder)
    for i, (g, loss) in enumerate(zip(gains, losses), start=1):
        if g is None or loss is None:
            continue
        out[i] = 100.0 if loss == 0 else 100 - 100 / (1 + g / loss)
    return out


def true_range(highs: Sequence[float], lows: Sequence[float], closes: Sequence[float]) -> list[float]:
    tr = [highs[0] - lows[0]] if closes else []
    for i in range(1, len(closes)):
        prev = closes[i - 1]
        tr.append(max(highs[i] - lows[i], abs(highs[i] - prev), abs(lows[i] - prev)))
    return tr


def atr(highs: Sequence[float], lows: Sequence[float], closes: Sequence[float], n: int = 14,
        wilder: bool = True) -> Series:
    return _smooth(true_range(highs, lows, closes), n, wilder)


def atr_pct(highs: Sequence[float], lows: Sequence[float], closes: Sequence[float], n: int = 14,
            wilder: bool = True) -> Series:
    """ATR as a percentage of the close, comparable across price levels."""
    return [None if a is None or not c else 100 * a / c for a, c in zip(atr(highs, lows, closes, n, wilder), closes)]
