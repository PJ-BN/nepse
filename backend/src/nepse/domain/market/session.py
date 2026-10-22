"""NEPSE trading-session and circuit-breaker rules."""
from collections.abc import Container
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from enum import StrEnum

from nepse.domain.calendar.npt import NPT

TRADING_WEEKDAYS = {6, 0, 1, 2, 3}  # Sun..Thu (Python: Mon=0, Sun=6)
PRE_OPEN_START, CONTINUOUS_START, CONTINUOUS_END = time(10, 30), time(11, 0), time(15, 0)

PRE_OPEN_BAND = 0.02
DAILY_BAND = 0.10


class MarketStatus(StrEnum):
    PRE_OPEN = "PRE_OPEN"
    OPEN = "OPEN"
    HALTED = "HALTED"  # inferred from the NEPSE index move (index_halt), not from the clock
    CLOSED = "CLOSED"


class Halt(StrEnum):
    NONE = "NONE"
    MIN_20 = "MIN_20"
    MIN_40 = "MIN_40"
    REST_OF_DAY = "REST_OF_DAY"


def is_trading_day(d: date, holidays: Container[date] = ()) -> bool:
    return d.weekday() in TRADING_WEEKDAYS and d not in holidays


def market_status(now: datetime, holidays: Container[date] = ()) -> MarketStatus:
    now = now.astimezone(NPT)
    if not is_trading_day(now.date(), holidays):
        return MarketStatus.CLOSED
    t = now.time()
    if PRE_OPEN_START <= t < CONTINUOUS_START:
        return MarketStatus.PRE_OPEN
    if CONTINUOUS_START <= t < CONTINUOUS_END:
        return MarketStatus.OPEN
    return MarketStatus.CLOSED


def price_band(prev_close: float, status: MarketStatus) -> tuple[float, float]:
    band = PRE_OPEN_BAND if status is MarketStatus.PRE_OPEN else DAILY_BAND
    return round(prev_close * (1 - band), 2), round(prev_close * (1 + band), 2)


def index_halt(change_pct: float, minutes_since_open: float) -> Halt:
    """Index circuit breaker: +-4% in 1st hour, +-5% in first 2 hours, +-6% anytime."""
    move = abs(change_pct)
    if move >= 6:
        return Halt.REST_OF_DAY
    if move >= 5 and minutes_since_open <= 120:
        return Halt.MIN_40
    if move >= 4 and minutes_since_open <= 60:
        return Halt.MIN_20
    return Halt.NONE


HALT_SEVERITY = {Halt.NONE: 0, Halt.MIN_20: 1, Halt.MIN_40: 2, Halt.REST_OF_DAY: 3}
HALT_MINUTES = {Halt.MIN_20: 20, Halt.MIN_40: 40}


@dataclass(frozen=True, slots=True)
class HaltState:
    level: Halt
    until: datetime  # trading resumes here (NPT); the close for REST_OF_DAY


def next_halt(prev: HaltState | None, change_pct: float, now: datetime) -> HaltState | None:
    """Today's latest halt after seeing the index move. A halt only (re)triggers on a higher level than the last."""
    now = now.astimezone(NPT)
    if prev and prev.until.astimezone(NPT).date() != now.date():
        prev = None
    start = now.replace(hour=CONTINUOUS_START.hour, minute=0, second=0, microsecond=0)
    level = index_halt(change_pct, (now - start).total_seconds() / 60)
    if HALT_SEVERITY[level] <= HALT_SEVERITY[prev.level if prev else Halt.NONE]:
        return prev
    close = now.replace(hour=CONTINUOUS_END.hour, minute=0, second=0, microsecond=0)
    until = close if level is Halt.REST_OF_DAY else min(now + timedelta(minutes=HALT_MINUTES[level]), close)
    return HaltState(level, until)
