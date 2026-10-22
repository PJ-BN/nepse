from datetime import date

import pytest

from nepse.application.charting.get_history import get_history, to_unix
from nepse.application.charting.ports import Bar
from nepse.application.charting.recompute_adjustments import recompute_adjustments
from nepse.domain.corporate_actions.adjustment import CorporateAction

D = [date(2025, 1, i) for i in (1, 2, 5, 6)]


class FakeChartRepo:
    def __init__(self, bars):
        self._bars = bars

    async def bars(self, symbol, start, end):
        return [b for b in self._bars if start <= b.trade_date <= end]

    async def last_date_before(self, symbol, d):
        return max((b.trade_date for b in self._bars if b.trade_date < d), default=None)


class FakeAdjRepo:
    def __init__(self, closes, actions):
        self._closes, self._actions, self.saved = closes, actions, None

    async def closes(self, company_id):
        return self._closes

    async def actions(self, company_id):
        return self._actions

    async def save_factors(self, company_id, daily, per_action):
        self.saved = (daily, per_action)


async def test_history_adjusts_prices_and_volume():
    repo = FakeChartRepo([Bar(D[0], 500, 510, 490, 500, 1000, 0.8), Bar(D[2], 400, 410, 390, 405, 2000, 1.0)])
    raw = await get_history(repo, "X", D[0], D[3], adjusted=False)
    adj = await get_history(repo, "X", D[0], D[3], adjusted=True)
    assert raw == {"s": "ok", "t": [to_unix(D[0]), to_unix(D[2])], "o": [500, 400], "h": [510, 410],
                   "l": [490, 390], "c": [500, 405], "v": [1000, 2000]}
    assert adj["c"] == [400, 405] and adj["h"] == [408, 410] and adj["v"] == [1250, 2000]


async def test_history_no_data_points_to_previous_bar():
    repo = FakeChartRepo([Bar(D[0], 1, 1, 1, 1, 1)])
    assert await get_history(repo, "X", D[2], D[3], True) == {"s": "no_data", "nextTime": to_unix(D[0])}
    assert await get_history(FakeChartRepo([]), "X", D[2], D[3], True) == {"s": "no_data"}


async def test_recompute_writes_daily_and_action_factors():
    closes = [(D[0], 480.0), (D[1], 500.0), (D[2], 400.0), (D[3], 410.0)]
    repo = FakeAdjRepo(closes, [(7, CorporateAction(date(2025, 1, 5), 0.10, 0.20))])
    assert await recompute_adjustments(repo, 1) == 4
    daily, per_action = repo.saved
    assert [f for _, f in daily] == pytest.approx([0.8, 0.8, 1.0, 1.0])
    assert per_action[0][0] == 7 and per_action[0][1] == pytest.approx(0.8)
