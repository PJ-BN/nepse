"""Bikram Sambat <-> Gregorian conversion and Nepali fiscal quarters (stdlib only)."""
from datetime import date, timedelta
from typing import NamedTuple

from nepse.domain.calendar.bs_month_days import BS_MONTH_DAYS

# BS 2000-01-01 (Baisakh 1) == AD 1943-04-14
_EPOCH_BS_YEAR = 2000
_EPOCH_AD = date(1943, 4, 14)


class BSDate(NamedTuple):
    year: int
    month: int  # 1 = Baisakh ... 12 = Chaitra
    day: int


def _month_days(year: int, month: int) -> int:
    try:
        return BS_MONTH_DAYS[year][month - 1]
    except KeyError:
        raise ValueError(f"BS year {year} outside supported range") from None


def bs_to_ad(year: int, month: int, day: int) -> date:
    if not 1 <= month <= 12 or not 1 <= day <= _month_days(year, month):
        raise ValueError(f"invalid BS date {year}-{month}-{day}")
    days = sum(sum(BS_MONTH_DAYS[y]) for y in range(_EPOCH_BS_YEAR, year))
    days += sum(BS_MONTH_DAYS[year][: month - 1]) + day - 1
    return _EPOCH_AD + timedelta(days=days)


def ad_to_bs(d: date) -> BSDate:
    remaining = (d - _EPOCH_AD).days
    if remaining < 0:
        raise ValueError(f"{d} is before the supported BS range")
    year = _EPOCH_BS_YEAR
    while True:
        months = BS_MONTH_DAYS.get(year)
        if months is None:
            raise ValueError(f"{d} is after the supported BS range")
        if remaining < sum(months):
            break
        remaining -= sum(months)
        year += 1
    for month, length in enumerate(BS_MONTH_DAYS[year], start=1):
        if remaining < length:
            return BSDate(year, month, remaining + 1)
        remaining -= length
    raise AssertionError("unreachable")


# Fiscal year Y/Y+1 runs Shrawan 1 of Y to the last day of Ashadh of Y+1.
# Quarter -> (BS year offset, first month, last month)
_QUARTERS = {1: (0, 4, 6), 2: (0, 7, 9), 3: (0, 10, 12), 4: (1, 1, 3)}


def fiscal_quarter_range(fy_start_year: int, quarter: int) -> tuple[date, date]:
    """AD start/end (inclusive) of quarter 1..4 of BS fiscal year `fy_start_year`/`fy_start_year+1`."""
    offset, first, last = _QUARTERS[quarter]
    y = fy_start_year + offset
    return bs_to_ad(y, first, 1), bs_to_ad(y, last, _month_days(y, last))


def fiscal_quarter_of(d: date) -> tuple[int, int]:
    """(fiscal-year start BS year, quarter) for an AD date."""
    bs = ad_to_bs(d)
    if bs.month >= 4:
        return bs.year, (bs.month - 4) // 3 + 1
    return bs.year - 1, 4
