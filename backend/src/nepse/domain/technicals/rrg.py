"""Relative Rotation Graph (JdK RS-Ratio / RS-Momentum) of sector indices against a benchmark.

Julius de Kempenaer never published the exact formula, so this uses the common open approximation:
    RS          = 100 * sector / benchmark
    RS-Ratio    = 100 + zscore(RS, window)               (rolling mean / population std over `window` bars)
    ROC         = 100 * (RS-Ratio_t / RS-Ratio_{t-1} - 1)
    RS-Momentum = 100 + zscore(ROC, window)
Both lines oscillate around 100; the quadrant comes from which side of 100 each sits on.
"""
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import date, timedelta
from enum import StrEnum
from statistics import fmean, pstdev

DatedSeries = Sequence[tuple[date, float]]


class Quadrant(StrEnum):
    LEADING = "Leading"
    WEAKENING = "Weakening"
    LAGGING = "Lagging"
    IMPROVING = "Improving"


def quadrant(rs_ratio: float, rs_momentum: float) -> Quadrant:
    if rs_ratio >= 100:
        return Quadrant.LEADING if rs_momentum >= 100 else Quadrant.WEAKENING
    return Quadrant.IMPROVING if rs_momentum >= 100 else Quadrant.LAGGING


@dataclass(frozen=True)
class RrgPoint:
    day: date
    rs_ratio: float
    rs_momentum: float


@dataclass(frozen=True)
class RrgTail:
    code: str
    quadrant: Quadrant
    tail: list[RrgPoint]  # oldest first; the last point is the current position


def _zscore_line(values: Sequence[float | None], window: int) -> list[float | None]:
    out: list[float | None] = [None] * len(values)
    for i in range(window - 1, len(values)):
        win = values[i - window + 1:i + 1]
        if any(v is None for v in win):
            continue
        sd = pstdev(win)  # type: ignore[arg-type]
        out[i] = 100.0 if sd == 0 else 100 + (values[i] - fmean(win)) / sd  # type: ignore[operator, arg-type]
    return out


def rs_lines(sector: Sequence[float], bench: Sequence[float], window: int) -> list[tuple[float, float] | None]:
    """(RS-Ratio, RS-Momentum) per bar for two aligned close series; None until there is enough history."""
    rs = [100 * s / b for s, b in zip(sector, bench)]
    ratio = _zscore_line(rs, window)
    roc: list[float | None] = [None] + [
        None if prev is None or cur is None else 100 * (cur / prev - 1) for prev, cur in zip(ratio, ratio[1:])
    ]
    momentum = _zscore_line(roc, window)
    return [None if r is None or m is None else (r, m) for r, m in zip(ratio, momentum)]


def to_weekly(series: DatedSeries) -> list[tuple[date, float]]:
    """Last close of each Sunday-Saturday week (NEPSE trades Sunday-Thursday, so ISO weeks would split it)."""
    weeks: dict[tuple[int, int], tuple[date, float]] = {}
    for d, c in sorted(series):
        weeks[(d + timedelta(days=1)).isocalendar()[:2]] = (d, c)
    return list(weeks.values())


def compute_rrg(sectors: Mapping[str, DatedSeries], bench: DatedSeries, window: int = 10, tail: int = 5,
                weekly: bool = False) -> list[RrgTail]:
    bench_map = dict(to_weekly(bench) if weekly else bench)
    out: list[RrgTail] = []
    for code, series in sectors.items():
        rows = [(d, c, bench_map[d]) for d, c in (to_weekly(series) if weekly else sorted(series))
                if d in bench_map and bench_map[d]]
        lines = rs_lines([c for _, c, _ in rows], [b for _, _, b in rows], window)
        points = [RrgPoint(d, *rm) for (d, _, _), rm in zip(rows, lines) if rm is not None][-tail:]
        if points:
            out.append(RrgTail(code, quadrant(points[-1].rs_ratio, points[-1].rs_momentum), points))
    return out
