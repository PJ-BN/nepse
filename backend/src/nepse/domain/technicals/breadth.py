"""Market breadth: advance/decline, McClellan oscillator and % of stocks above a moving average."""
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass

from nepse.domain.technicals.indicators import Series, ema


@dataclass(frozen=True)
class AdvanceDecline:
    advances: int
    declines: int
    unchanged: int

    @property
    def net(self) -> int:
        return self.advances - self.declines


def advance_decline(changes: Iterable[float]) -> AdvanceDecline:
    """Count price changes (close - prev_close) by sign."""
    adv = dec = unch = 0
    for c in changes:
        if c > 0:
            adv += 1
        elif c < 0:
            dec += 1
        else:
            unch += 1
    return AdvanceDecline(adv, dec, unch)


def mcclellan_oscillator(net_advances: Sequence[float], fast: int = 19, slow: int = 39) -> Series:
    """EMA19 - EMA39 of daily net advances (advances - declines), oldest first."""
    return [None if f is None or s is None else f - s for f, s in zip(ema(net_advances, fast), ema(net_advances, slow))]


def pct_above_sma(closes_by_symbol: Mapping[str, Sequence[float]], n: int) -> float | None:
    """Percentage of symbols whose latest close is above their n-day SMA. Symbols with < n bars are ignored."""
    eligible = above = 0
    for closes in closes_by_symbol.values():
        if len(closes) < n:
            continue
        eligible += 1
        if closes[-1] > sum(closes[-n:]) / n:
            above += 1
    return None if eligible == 0 else 100 * above / eligible
