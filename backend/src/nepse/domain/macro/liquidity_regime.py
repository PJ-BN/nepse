"""Liquidity Regime Score for Nepal's banking system.

Score (0-100, higher = easier liquidity = friendlier for equities) from the 30-day rate of change of the
credit-to-deposit (CD) ratio and the weighted-average interbank rate. Falling values mean banks have spare
deposits and cheap overnight money, which historically precedes NEPSE rallies.

    roc_x       = 100 * (x_now / x_30d_ago - 1)            relative % change over 30 calendar days
    cd_part     = clamp(-roc_cd / CD_ROC_FULL,  -1, 1)     CD ratio moves slowly: a 2.5% relative fall saturates
    ib_part     = clamp(-roc_ib / IB_ROC_FULL,  -1, 1)     interbank is volatile: a 25% relative fall saturates
    score       = 50 + 25 * cd_part + 25 * ib_part

So 50 = unchanged, 100 = both falling fast, 0 = both rising fast.

The regime label uses levels, not momentum:
    BULLISH  CD ratio < 82%  and interbank < 3.5%
    BEARISH  CD ratio >= 88% or  interbank >= 6%     (near the NRB CD ceiling / stressed overnight money)
    NEUTRAL  otherwise
"""
from bisect import bisect_right
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, timedelta
from enum import StrEnum

CD_ROC_FULL = 2.5
IB_ROC_FULL = 25.0
CD_BULLISH, IB_BULLISH = 82.0, 3.5
CD_BEARISH, IB_BEARISH = 88.0, 6.0
LOOKBACK_DAYS = 30


class Regime(StrEnum):
    BULLISH = "BULLISH"
    NEUTRAL = "NEUTRAL"
    BEARISH = "BEARISH"


@dataclass(frozen=True)
class LiquidityRegime:
    score: float
    regime: Regime
    cd_ratio: float
    interbank_rate: float
    cd_roc_30d: float | None
    interbank_roc_30d: float | None


def _clamp(x: float) -> float:
    return max(-1.0, min(1.0, x))


def roc(now: float, then: float | None) -> float | None:
    return None if not then else 100 * (now / then - 1)


def value_on_or_before(series: Sequence[tuple[date, float]], day: date) -> float | None:
    """Latest observation on or before `day`; series must be sorted by date."""
    i = bisect_right([d for d, _ in series], day)
    return series[i - 1][1] if i else None


def classify(cd_ratio: float, interbank: float) -> Regime:
    if cd_ratio < CD_BULLISH and interbank < IB_BULLISH:
        return Regime.BULLISH
    if cd_ratio >= CD_BEARISH or interbank >= IB_BEARISH:
        return Regime.BEARISH
    return Regime.NEUTRAL


def score(cd_roc: float | None, ib_roc: float | None) -> float:
    """Missing history (None) counts as unchanged."""
    cd_part = _clamp(-(cd_roc or 0.0) / CD_ROC_FULL)
    ib_part = _clamp(-(ib_roc or 0.0) / IB_ROC_FULL)
    return 50 + 25 * cd_part + 25 * ib_part


def liquidity_regime(cd_series: Sequence[tuple[date, float]],
                     ib_series: Sequence[tuple[date, float]]) -> LiquidityRegime | None:
    """Both series sorted oldest first. None if either is empty."""
    if not cd_series or not ib_series:
        return None
    (cd_day, cd), (ib_day, ib) = cd_series[-1], ib_series[-1]
    cd_roc = roc(cd, value_on_or_before(cd_series, cd_day - timedelta(days=LOOKBACK_DAYS)))
    ib_roc = roc(ib, value_on_or_before(ib_series, ib_day - timedelta(days=LOOKBACK_DAYS)))
    return LiquidityRegime(round(score(cd_roc, ib_roc), 1), classify(cd, ib), cd, ib, cd_roc, ib_roc)
