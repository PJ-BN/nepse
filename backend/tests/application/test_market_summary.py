from datetime import datetime

from nepse.application.market.get_market_summary import get_market_summary
from nepse.application.market.ports import IndexValue, Quote
from nepse.domain.calendar.npt import NPT
from nepse.domain.market.session import MarketStatus

SUNDAY_NOON = datetime(2025, 4, 20, 12, 0, tzinfo=NPT)
FRIDAY_NOON = datetime(2025, 4, 18, 12, 0, tzinfo=NPT)


class FakeSource:
    def __init__(self, quotes=(), indices=(), status=None):
        self._q, self._i, self._s = list(quotes), list(indices), status

    async def status(self):
        return self._s

    async def quotes(self):
        return self._q

    async def indices(self):
        return self._i

    async def as_of(self):
        return None


def q(sym, pct, turnover=100.0):
    return Quote(sym, 100 + pct, pct, pct, 10, turnover)


QUOTES = [q(f"S{i}", i - 5, turnover=i * 10) for i in range(15)]  # pct -5..9
INDICES = [IndexValue("NEPSE", 2700, 10, 0.37), IndexValue("BANKING", 1400, -2, -0.1), IndexValue("FLOAT", 190, 1, 0.5)]


async def test_live_data_wins():
    s = await get_market_summary(FakeSource(QUOTES, INDICES, MarketStatus.HALTED), FakeSource([q("EOD", 1)]), SUNDAY_NOON)
    assert s.source == "live" and s.status is MarketStatus.HALTED
    assert s.index.value == 2700 and [i.code for i in s.sub_indices] == ["BANKING"]
    assert (s.advances, s.declines, s.unchanged) == (9, 5, 1)
    assert [x.symbol for x in s.gainers][:2] == ["S14", "S13"] and len(s.gainers) == 9
    assert [x.symbol for x in s.losers] == ["S0", "S1", "S2", "S3", "S4"]
    assert len(s.top_turnover) == 10 and s.top_turnover[0].symbol == "S14"
    assert s.turnover == sum(i * 10 for i in range(15))


async def test_falls_back_to_eod_and_clock_status():
    s = await get_market_summary(FakeSource(), FakeSource([q("EOD", 1)], INDICES), SUNDAY_NOON)
    assert s.source == "eod" and s.status is MarketStatus.OPEN and s.gainers[0].symbol == "EOD"
    empty = await get_market_summary(FakeSource(), FakeSource(), FRIDAY_NOON)
    assert empty.source == "empty" and empty.status is MarketStatus.CLOSED and empty.index is None
