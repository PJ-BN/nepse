"""What happened after a signal. Bar i's signal is only known at its close, so the entry is the close of bar i+1
(NEPSE's old open prices are synthetic, so there are no open fills). Returns are percent."""
from dataclasses import dataclass

from nepse.domain.simulation.rules import Candles


@dataclass(frozen=True)
class HorizonResult:
    horizon: int  # bars after the entry bar
    ret: float  # close-to-close return, net of cost_pct
    mfe: float  # best high seen in the window vs entry (>= 0)
    mae: float  # worst low seen in the window vs entry (<= 0)


@dataclass(frozen=True)
class Bracket:
    outcome: str  # target | stop | neither | open (window not fully observed yet)
    bars: int | None  # bars after entry when hit
    ret: float | None  # +target / -stop net of cost; None unless hit


@dataclass(frozen=True)
class Forward:
    signal: int
    entry: int
    entry_price: float
    results: list[HorizonResult]  # only horizons whose bars all exist
    path: list[float]  # gross return at each bar after entry, up to the longest horizon
    bracket: Bracket | None


def forward(c: Candles, i: int, horizons: list[int], target_pct: float | None = None,
            stop_pct: float | None = None, cost_pct: float = 0.0) -> Forward | None:
    e = i + 1
    if e >= len(c):
        return None
    entry = c.close[e]
    longest = max(horizons)
    last = min(e + longest, len(c) - 1)
    path = [100 * (c.close[j] / entry - 1) for j in range(e + 1, last + 1)]

    results = []
    for h in sorted(set(horizons)):
        if e + h >= len(c):
            continue
        window = range(e + 1, e + h + 1)
        results.append(HorizonResult(
            h, path[h - 1] - cost_pct,
            max(0.0, 100 * (max(c.high[j] for j in window) / entry - 1)),
            min(0.0, 100 * (min(c.low[j] for j in window) / entry - 1))))

    bracket = None
    if target_pct is not None or stop_pct is not None:
        up = entry * (1 + target_pct / 100) if target_pct is not None else None
        down = entry * (1 - stop_pct / 100) if stop_pct is not None else None
        bracket = Bracket("neither" if e + longest < len(c) else "open", None, None)
        for j in range(e + 1, last + 1):
            hit_stop = down is not None and c.low[j] <= down
            hit_target = up is not None and c.high[j] >= up
            if hit_stop:  # a bar touching both counts as the stop: the conservative reading
                bracket = Bracket("stop", j - e, -stop_pct - cost_pct)  # type: ignore[operator]
                break
            if hit_target:
                bracket = Bracket("target", j - e, target_pct - cost_pct)  # type: ignore[operator]
                break
    return Forward(i, e, entry, results, path, bracket)
