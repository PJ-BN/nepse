from datetime import date, timedelta

import pytest

from nepse.application.breadth.get_breadth import get_breadth
from nepse.application.macro.ports import CD_RATIO, INTERBANK_RATE, IssueRow, Observation
from nepse.application.macro.use_cases import (
    SECTOR_INDICES, get_ipo_pipeline, get_macro_radar, get_rrg, ingest_nrb, ingest_sebon,
)

D0 = date(2026, 1, 1)


class FakeBreadthRepo:
    def __init__(self, closes):
        self.closes = closes

    async def adjusted_closes(self, days):
        return self.closes


async def test_breadth():
    up = [(D0 + timedelta(days=i), 100.0 + i) for i in range(250)]
    down = [(D0 + timedelta(days=i), 500.0 - i) for i in range(250)]
    flat = [(D0 + timedelta(days=i), 50.0) for i in range(250)]
    res = await get_breadth(FakeBreadthRepo({"UP": up, "DN": down, "FL": flat}))
    assert (res["advances"], res["declines"], res["unchanged"]) == (1, 1, 1)
    assert res["as_of"] == up[-1][0]
    assert res["pct_above"] == {"sma_20": pytest.approx(100 / 3), "sma_50": pytest.approx(100 / 3),
                                "sma_200": pytest.approx(100 / 3)}
    assert res["mcclellan"] == pytest.approx(0)  # net advances always 0
    assert len(res["series"]) == 60
    assert await get_breadth(FakeBreadthRepo({})) is None


class FakeMacroRepo:
    def __init__(self, series=None, indices=None, issues=None):
        self._series, self._indices, self._issues = series or {}, indices or {}, issues or []
        self.saved: list = []

    async def upsert_observations(self, rows):
        self.saved += rows
        return len(rows)

    async def series(self, indicators, since):
        return {k: v for k, v in self._series.items() if k in indicators}

    async def index_closes(self, codes, since):
        return {k: list(v) for k, v in self._indices.items() if k in codes}

    async def upsert_issues(self, rows):
        self.saved += rows
        return len(rows)

    async def issues(self):
        return self._issues


async def test_rrg_returns_all_sectors_with_tails():
    days = [D0 + timedelta(days=i) for i in range(60)]
    indices = {"NEPSE": [(d, 2000.0 + i) for i, d in enumerate(days)]}
    for k, code in enumerate(SECTOR_INDICES):
        indices[code] = [(d, 100.0 + i * (k + 1) / 10) for i, d in enumerate(days)]
    res = await get_rrg(FakeMacroRepo(indices=indices), "daily", tail=5, today=days[-1])
    assert len(res["sectors"]) == 13
    s = res["sectors"][0]
    assert s["quadrant"] in {"Leading", "Weakening", "Lagging", "Improving"}
    assert len(s["tail"]) == 5 and s["tail"][-1]["date"] == days[-1]
    with pytest.raises(ValueError):
        await get_rrg(FakeMacroRepo(), "hourly")


async def test_macro_radar():
    series = {CD_RATIO: [(date(2026, 9, 1), 72.0), (date(2026, 10, 11), 70.2)],
              INTERBANK_RATE: [(date(2026, 9, 1), 3.0), (date(2026, 10, 11), 2.75)]}
    res = await get_macro_radar(FakeMacroRepo(series, {"NEPSE": [(date(2026, 10, 11), 2600.0)]}))
    assert res["regime"]["regime"] == "BULLISH" and res["regime"]["score"] > 50
    assert res["nepse"] == [{"date": date(2026, 10, 11), "value": 2600.0}]
    assert res["series"][CD_RATIO][-1]["value"] == 70.2
    assert (await get_macro_radar(FakeMacroRepo()))["regime"] is None


async def test_ingest_and_ipo_list():
    class Src:
        def __init__(self, rows):
            self.rows = rows

        async def fetch(self):
            return self.rows

    repo = FakeMacroRepo(issues=[IssueRow("Him Parbat Hydropower Limited", "IPO", "APPROVED")])
    assert await ingest_nrb(Src([Observation(CD_RATIO, D0, 70.0, "nrb")]), repo) == 1
    assert await ingest_sebon(Src([IssueRow("X", "RIGHT", "PIPELINE")]), repo) == 1
    assert (await get_ipo_pipeline(repo))[0]["company"] == "Him Parbat Hydropower Limited"
