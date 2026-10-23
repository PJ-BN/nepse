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


def rsi_bullish_divergence(closes: Sequence[float], n: int = 14, window: int = 15) -> bool:
    """Price makes a lower low while RSI makes a higher low: the lowest close of the last `window` bars
    against the lowest close of the `window` bars before it, compared by RSI at those two bars.
    Uses Cutler's RSI so it matches mv_screener_snapshot.rsi_bull_div; ties pick the most recent bar."""
    r = rsi(closes, n, wilder=False)
    if len(closes) < 2 * window or any(v is None for v in r[-2 * window:]):
        return False

    def low(lo: int, hi: int) -> int:
        return min(range(lo, hi), key=lambda i: (closes[i], -i))

    recent, prior = low(len(closes) - window, len(closes)), low(len(closes) - 2 * window, len(closes) - window)
    return closes[recent] < closes[prior] and r[recent] > r[prior]  # type: ignore[operator]


def _on_defined(series: Series, fn) -> Series:
    """Apply `fn` (a values -> Series indicator) to the defined tail of `series`, keeping the None warm-up prefix."""
    start = next((i for i, v in enumerate(series) if v is not None), len(series))
    return [None] * start + fn(series[start:])


def macd(closes: Sequence[float], fast: int = 12, slow: int = 26, signal: int = 9) -> tuple[Series, Series, Series]:
    """(line, signal, histogram): line = EMA(fast) - EMA(slow), signal = EMA of the line."""
    ef, es = ema(closes, fast), ema(closes, slow)
    line: Series = [None if a is None or b is None else a - b for a, b in zip(ef, es)]
    sig = _on_defined(line, lambda tail: ema(tail, signal))
    hist: Series = [None if a is None or b is None else a - b for a, b in zip(line, sig)]
    return line, sig, hist


def bollinger(closes: Sequence[float], n: int = 20, k: float = 2.0) -> tuple[Series, Series, Series]:
    """(mid, upper, lower): SMA(n) +/- k population standard deviations."""
    mid = sma(closes, n)
    upper: Series = [None] * len(closes)
    lower: Series = [None] * len(closes)
    for i, m in enumerate(mid):
        if m is None:
            continue
        sd = (sum((v - m) ** 2 for v in closes[i - n + 1:i + 1]) / n) ** 0.5
        upper[i], lower[i] = m + k * sd, m - k * sd
    return mid, upper, lower


def highest(values: Sequence[float], n: int) -> Series:
    return [None if i < n - 1 else max(values[i - n + 1:i + 1]) for i in range(len(values))]


def lowest(values: Sequence[float], n: int) -> Series:
    return [None if i < n - 1 else min(values[i - n + 1:i + 1]) for i in range(len(values))]


def stochastic(highs: Sequence[float], lows: Sequence[float], closes: Sequence[float], k: int = 14,
               d: int = 3) -> tuple[Series, Series]:
    """(%K, %D): %K = where the close sits in the k-bar range (50 when the range is flat), %D = SMA(d) of %K."""
    hh, ll = highest(highs, k), lowest(lows, k)
    pk: Series = [None if h is None or lo is None else 50.0 if h == lo else 100 * (c - lo) / (h - lo)
                  for h, lo, c in zip(hh, ll, closes)]
    return pk, _on_defined(pk, lambda tail: sma(tail, d))


def adx(highs: Sequence[float], lows: Sequence[float], closes: Sequence[float],
        n: int = 14) -> tuple[Series, Series, Series]:
    """Wilder ADX with +DI and -DI. DI starts at bar n, ADX at bar 2n-1."""
    size = len(closes)
    adx_out: Series = [None] * size
    plus_out: Series = [None] * size
    minus_out: Series = [None] * size
    if size <= n:
        return adx_out, plus_out, minus_out
    up = [highs[i] - highs[i - 1] for i in range(1, size)]
    down = [lows[i - 1] - lows[i] for i in range(1, size)]
    plus_dm = [u if u > d and u > 0 else 0.0 for u, d in zip(up, down)]
    minus_dm = [d if d > u and d > 0 else 0.0 for u, d in zip(up, down)]
    tr = _smooth(true_range(highs, lows, closes)[1:], n, True)
    pdm, mdm = _smooth(plus_dm, n, True), _smooth(minus_dm, n, True)
    dx: list[float] = []
    for j, (t, p, m) in enumerate(zip(tr, pdm, mdm)):
        if t is None or p is None or m is None:
            continue
        pi, mi = (100 * p / t, 100 * m / t) if t else (0.0, 0.0)
        plus_out[j + 1], minus_out[j + 1] = pi, mi
        dx.append(0.0 if pi + mi == 0 else 100 * abs(pi - mi) / (pi + mi))
    for j, v in enumerate(_smooth(dx, n, True)):
        adx_out[n + j] = v  # dx[0] belongs to bar n
    return adx_out, plus_out, minus_out


def roc(closes: Sequence[float], n: int = 12) -> Series:
    """Rate of change in percent over n bars."""
    return [None if i < n or not closes[i - n] else 100 * (closes[i] / closes[i - n] - 1) for i in range(len(closes))]


def obv(closes: Sequence[float], volumes: Sequence[float]) -> list[float]:
    out = [0.0] * len(closes)
    for i in range(1, len(closes)):
        step = volumes[i] if closes[i] > closes[i - 1] else -volumes[i] if closes[i] < closes[i - 1] else 0.0
        out[i] = out[i - 1] + step
    return out
