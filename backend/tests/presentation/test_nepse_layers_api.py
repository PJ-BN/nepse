from datetime import date, datetime

from nepse.application.calendar.ports import DividendEvent
from nepse.application.nepse_layers.ports import DailyClose
from nepse.domain.market.circuit import circuit_limits, volume_profile
from nepse.presentation.api.v1.nepse_layers import calendar_repo, layers_repo


class FakeLayers:
    async def daily_closes(self, symbol, start, end):
        return [DailyClose(date(2025, 1, 1), None, 1.0), DailyClose(date(2025, 1, 2), 100.0, 0.5)]

    async def trade_levels(self, symbol, start, end):
        self.window = (start, end)
        return [(100.0, 10), (110.0, 30), (120.0, 5)]


class FakeCalendar:
    async def dividend_events(self, *, symbol=None, limit=100, **_):
        return [DividendEvent(symbol, "X", "81/82", 10, 5, None, date(2025, 1, 5), None),
                DividendEvent(symbol, "X", "80/81", 0, 0, None, date(2024, 1, 5), None),
                DividendEvent(symbol, "X", "79/80", 20, 0, None, None, None)]


def test_domain():
    assert circuit_limits(100.0) == (90.0, 110.0)
    bins, poc = volume_profile([(100.0, 10), (110.0, 30), (120.0, 5)], 2)
    assert [b.qty for b in bins] == [10, 35] and poc == 1
    assert volume_profile([], 5) == ([], None)


async def test_circuit_limits_skip_first_bar_and_follow_adjustment(client, override):
    override(layers_repo, FakeLayers())
    q = {"symbol": "abc", "from": "2025-01-01", "to": "2025-01-31"}
    assert (await client.get("/api/v1/nepse/circuit-limits", params=q)).json() == [
        {"date": "2025-01-02", "lower": 45.0, "upper": 55.0}]
    raw = (await client.get("/api/v1/nepse/circuit-limits", params={**q, "adjusted": "false"})).json()
    assert raw[0]["upper"] == 110.0


async def test_corporate_actions_only_dated_with_an_action(client, override):
    override(calendar_repo, FakeCalendar())
    r = (await client.get("/api/v1/nepse/corporate-actions", params={"symbol": "x"})).json()
    assert [(a["date"], a["bonus_pct"], a["cash_pct"]) for a in r] == [("2025-01-05", 10, 5)]


async def test_volume_profile_end_day_inclusive(client, override):
    fake = FakeLayers()
    override(layers_repo, fake)
    r = (await client.get("/api/v1/nepse/volume-profile",
                          params={"symbol": "x", "from": "2025-01-01", "to": "2025-01-01", "bins": 2})).json()
    assert r["poc"] == 1 and sum(b["qty"] for b in r["bins"]) == 45
    assert fake.window[1] - fake.window[0] == (datetime(2025, 1, 2) - datetime(2025, 1, 1))
