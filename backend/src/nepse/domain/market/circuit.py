"""NEPSE daily price band: a stock may move at most +-10% from the previous close."""
from dataclasses import dataclass

BAND = 0.10


@dataclass(frozen=True)
class VolumeBin:
    low: float
    high: float
    qty: int


def circuit_limits(prev_close: float) -> tuple[float, float]:
    return round(prev_close * (1 - BAND), 2), round(prev_close * (1 + BAND), 2)


def volume_profile(levels: list[tuple[float, int]], bins: int) -> tuple[list[VolumeBin], int | None]:
    """Bucket (price, qty) trades into `bins` equal-width price bins; also returns the index of the busiest bin."""
    if not levels:
        return [], None
    lo, hi = min(p for p, _ in levels), max(p for p, _ in levels)
    step = (hi - lo) / bins or 1.0
    qty = [0] * bins
    for p, q in levels:
        qty[min(int((p - lo) / step), bins - 1)] += q
    out = [VolumeBin(round(lo + i * step, 2), round(lo + (i + 1) * step, 2), q) for i, q in enumerate(qty)]
    return out, max(range(bins), key=qty.__getitem__)
