from datetime import date, timedelta

import pytest

from nepse.domain.calendar.bs_calendar import BSDate, ad_to_bs, bs_to_ad, fiscal_quarter_of, fiscal_quarter_range


@pytest.mark.parametrize(
    ("bs", "ad"),
    [
        (BSDate(2000, 1, 1), date(1943, 4, 14)),
        (BSDate(2081, 1, 1), date(2024, 4, 13)),  # BS new year 2081
        (BSDate(2082, 1, 1), date(2025, 4, 14)),  # BS new year 2082
    ],
)
def test_known_dates(bs, ad):
    assert bs_to_ad(*bs) == ad
    assert ad_to_bs(ad) == bs


def test_round_trip_every_day_for_a_decade():
    d = date(2015, 1, 1)
    while d < date(2026, 1, 1):
        assert bs_to_ad(*ad_to_bs(d)) == d
        d += timedelta(days=1)


def test_fiscal_quarters_are_contiguous_and_cover_the_year():
    ranges = [fiscal_quarter_range(2081, q) for q in (1, 2, 3, 4)]
    assert ranges[0][0] == bs_to_ad(2081, 4, 1)  # Shrawan 1
    for (_, end), (start, _) in zip(ranges, ranges[1:]):
        assert start - end == timedelta(days=1)
    assert ranges[3][1] + timedelta(days=1) == bs_to_ad(2082, 4, 1)
    assert fiscal_quarter_of(ranges[3][1]) == (2081, 4)
    assert fiscal_quarter_of(ranges[0][0]) == (2081, 1)


def test_invalid_dates_raise():
    with pytest.raises(ValueError):
        bs_to_ad(2081, 13, 1)
    with pytest.raises(ValueError):
        bs_to_ad(2081, 1, 40)
