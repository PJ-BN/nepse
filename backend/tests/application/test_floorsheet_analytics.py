from datetime import datetime

import pytest

from nepse.application.floorsheet.analytics import (
    detect_whales, get_broker_analytics, get_broker_profile, latest_whales, scan_accumulation,
)
from nepse.application.floorsheet.ports import BrokerStockRow, Company
from nepse.domain.calendar.npt import NPT
from nepse.domain.floorsheet.metrics import BrokerDay, Trade

# pytest-asyncio is missing from the image; anyio ships its own pytest plugin.
pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend():
    return "asyncio"


DAY = datetime(2025, 4, 20, tzinfo=NPT)
T = datetime(2025, 4, 20, 11, 5, tzinfo=NPT)


class FakeRepo:
    def __init__(self, rows, bars=None, public_shares=1_000_000, has_data=True):
        self.rows, self.bars, self.public_shares, self.has_data = rows, bars or {}, public_shares, has_data

    async def company(self, symbol):
        return Company(1, symbol, self.public_shares) if symbol in {r.symbol for r in self.rows} | {"EMPTY"} else None

    async def window_start(self, days):
        return DAY if self.has_data else None

    async def broker_rows(self, start, *, symbol=None, broker=None):
        return [r for r in self.rows if symbol in (None, r.symbol) and broker in (None, r.row.broker)]

    async def ltp(self, company_id):
        return 120.0

    async def flows(self, company_id, start):
        return [(1, 4, 300), (1, 3, 200), (2, 3, 100), (5, 5, 999)]

    async def daily_bars(self, start):
        return self.bars

    async def recent_whales(self, symbol, limit):
        return [Trade(7, "ABC", 1, 2, 6000, 100, 600_000, T), Trade(8, "ABC", 1, 2, 10, 100, 1000, T)]


ABC = [
    BrokerStockRow("ABC", "HYDRO", BrokerDay(1, 600, 100, 60_000, 11_000)),
    BrokerStockRow("ABC", "HYDRO", BrokerDay(2, 300, 200, 33_000, 20_000)),
    BrokerStockRow("ABC", "HYDRO", BrokerDay(3, 100, 400, 10_000, 42_000)),
    BrokerStockRow("ABC", "HYDRO", BrokerDay(4, 0, 300, 0, 30_000)),
]


async def test_broker_analytics_matrix():
    a = await get_broker_analytics(FakeRepo(ABC), "ABC", days=5)
    assert a.total_volume == 1000
    assert sum(r.buy_qty for r in a.rows) == sum(r.sell_qty for r in a.rows) == 1000
    assert [r.broker for r in a.rows][:2] == [1, 2]  # sorted by net
    top = a.rows[0]
    assert (top.net, top.bar, top.buy_vwap, top.unrealised_pl) == (500, 0.5, 100, 10_000)
    assert top.margin_pct == pytest.approx(0.2)
    assert a.cornering_index == pytest.approx(0.6)
    assert a.float_market_cap == 120_000_000 and a.cornering_alert
    assert [(link.buyer, link.seller, link.qty) for link in a.sankey] == [(1, 4, 300), (1, 3, 200), (2, 3, 100)]


async def test_broker_analytics_filtered_and_errors():
    a = await get_broker_analytics(FakeRepo(ABC), "ABC", days=5, broker_no=3)
    assert [r.broker for r in a.rows] == [3]
    assert a.cornering_index == pytest.approx(0.6)  # still market-wide
    assert {(link.buyer, link.seller) for link in a.sankey} == {(1, 3), (2, 3)}
    with pytest.raises(LookupError):
        await get_broker_analytics(FakeRepo(ABC), "NOPE", days=5)
    empty = await get_broker_analytics(FakeRepo(ABC, has_data=False), "ABC", days=5)
    assert empty.rows == [] and empty.from_day is None


async def test_broker_profile():
    rows = [
        BrokerStockRow("ABC", "HYDRO", BrokerDay(1, 600, 100, 60_000, 11_000)),
        BrokerStockRow("XYZ", "BANKING", BrokerDay(1, 0, 50, 0, 25_000)),
        BrokerStockRow("ABC", "HYDRO", BrokerDay(2, 1, 0, 100, 0)),
    ]
    p = await get_broker_profile(FakeRepo(rows), 1)
    assert [w.label for w in p.windows] == ["today", "week", "month"]
    w = p.windows[0]
    assert [(s.symbol, s.net_qty, s.net_amt) for s in w.top_stocks] == [("ABC", 500, 49_000)]
    assert w.sectors == {"HYDRO": 49_000, "BANKING": -25_000}


async def test_scan_accumulation():
    rows = [
        # ABC: brokers 1-5 each net +100 of 1000 volume -> top-5 share 0.5
        *[BrokerStockRow("ABC", "HYDRO", BrokerDay(b, 150, 50, 0, 0)) for b in range(1, 6)],
        BrokerStockRow("ABC", "HYDRO", BrokerDay(9, 250, 750, 0, 0)),
        # XYZ: evenly churned -> share 0
        BrokerStockRow("XYZ", "BANKING", BrokerDay(1, 100, 100, 0, 0)),
    ]
    calm = [(101, 99, 100)] * 10
    hits = await scan_accumulation(FakeRepo(rows, {"ABC": calm, "XYZ": calm}))
    assert [(h.symbol, h.top5_share, h.top_brokers) for h in hits] == [("ABC", 0.5, [1, 2, 3, 4, 5])]
    # Same flows but volatile price -> no hit
    assert await scan_accumulation(FakeRepo(rows, {"ABC": [(110, 90, 100)] * 10})) == []


async def test_whales():
    events = await latest_whales(FakeRepo(ABC))
    assert events == [{
        "contract_no": 7, "symbol": "ABC", "buyer_broker": 1, "seller_broker": 2,
        "qty": 6000, "rate": 100.0, "amount": 600_000.0, "trade_time": "2025-04-20T11:05:00+05:45",
    }]
    assert detect_whales([]) == []
