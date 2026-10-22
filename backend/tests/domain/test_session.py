from datetime import date, datetime

from nepse.domain.calendar.npt import NPT
from nepse.domain.market.session import Halt, MarketStatus, index_halt, market_status, price_band

SUNDAY = date(2025, 4, 20)
FRIDAY = date(2025, 4, 18)


def at(d: date, h: int, m: int) -> datetime:
    return datetime(d.year, d.month, d.day, h, m, tzinfo=NPT)


def test_market_status_through_the_day():
    assert market_status(at(SUNDAY, 10, 29)) is MarketStatus.CLOSED
    assert market_status(at(SUNDAY, 10, 30)) is MarketStatus.PRE_OPEN
    assert market_status(at(SUNDAY, 11, 0)) is MarketStatus.OPEN
    assert market_status(at(SUNDAY, 14, 59)) is MarketStatus.OPEN
    assert market_status(at(SUNDAY, 15, 0)) is MarketStatus.CLOSED


def test_weekend_and_holidays_closed():
    assert market_status(at(FRIDAY, 12, 0)) is MarketStatus.CLOSED
    assert market_status(at(SUNDAY, 12, 0), holidays={SUNDAY}) is MarketStatus.CLOSED


def test_utc_input_is_converted_to_npt():
    utc = datetime.fromisoformat("2025-04-20T05:15:00+00:00")  # 11:00 NPT
    assert market_status(utc) is MarketStatus.OPEN


def test_price_bands():
    assert price_band(1000, MarketStatus.OPEN) == (900, 1100)
    assert price_band(1000, MarketStatus.PRE_OPEN) == (980, 1020)


def test_index_circuit_breakers():
    assert index_halt(-4.1, 30) is Halt.MIN_20
    assert index_halt(4.1, 90) is Halt.NONE
    assert index_halt(5.0, 90) is Halt.MIN_40
    assert index_halt(5.5, 200) is Halt.NONE
    assert index_halt(-6.0, 250) is Halt.REST_OF_DAY


def test_next_halt_triggers_once_per_level_and_caps_at_close():
    from nepse.domain.market.session import Halt, next_halt
    t = at(SUNDAY, 11, 30)
    assert next_halt(None, 3.9, t) is None
    h = next_halt(None, -4.1, t)
    assert (h.level, h.until) == (Halt.MIN_20, at(SUNDAY, 11, 50))
    assert next_halt(h, -4.2, at(SUNDAY, 11, 55)) is h  # same level does not retrigger
    h2 = next_halt(h, 5.2, at(SUNDAY, 12, 0))
    assert (h2.level, h2.until) == (Halt.MIN_40, at(SUNDAY, 12, 40))
    h3 = next_halt(h2, 6, at(SUNDAY, 14, 0))
    assert (h3.level, h3.until) == (Halt.REST_OF_DAY, at(SUNDAY, 15, 0))
    assert next_halt(h3, 0, at(SUNDAY, 14, 30)) is h3
    assert next_halt(h3, 4.5, at(date(2025, 4, 21), 11, 10)).level is Halt.MIN_20  # next day starts fresh
    assert next_halt(None, 4.5, at(SUNDAY, 12, 30)) is None  # 4% only counts in the first hour
