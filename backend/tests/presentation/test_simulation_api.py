"""POST /api/v1/simulation/run over a fake bar source, plus the use case's look-ahead guarantees."""
import json
import math
import os
from dataclasses import replace
from datetime import date, timedelta
from pathlib import Path

import pytest

from nepse.application.charting.ports import Bar, SymbolInfo
from nepse.application.simulation.run_simulation import SimulationRequest, run_simulation
from nepse.presentation.api.v1 import simulation

FIXTURE = Path(__file__).parent / "fixtures" / "simulation_response.json"
RULE = {"or": [
    {"left": {"ind": "close"}, "op": "crosses_above", "right": {"ind": "sma", "n": 5}},
    {"left": {"ind": "rsi", "n": 5}, "op": "<", "right": 35},
]}


def make_bars(n=300, start=date(2024, 1, 1)):
    bars, d = [], start
    while len(bars) < n:
        if d.weekday() < 5:  # business days only, so a Saturday anchor has to fall back
            i = len(bars)
            c = 100 + 10 * math.sin(i / 5) + i * 0.05
            bars.append(Bar(d, c, c + 1, c - 1, c, 1000 + i))
        d += timedelta(days=1)
    return bars


class FakeRepo:
    def __init__(self, bars):
        self._bars = bars

    async def bars(self, symbol, start, end):
        return [b for b in self._bars if start <= b.trade_date <= end]

    async def find_symbol(self, symbol):
        return SymbolInfo("NABIL", "Nabil Bank") if symbol == "NABIL" else None


@pytest.fixture
def bars():
    return make_bars()


@pytest.fixture
def post(client, override, bars):
    override(simulation.bar_source, FakeRepo(bars))

    async def go(**kw):
        body = {"symbol": "NABIL", "anchor_date": bars[200].trade_date.isoformat(), "rules": RULE,
                "horizons": [5, 10]} | kw
        return await client.post("/api/v1/simulation/run", json=body)
    return go


async def test_run_returns_the_contract(post, bars):
    r = await post(target_pct=5, stop_pct=5, cost_pct=0.5)
    assert r.status_code == 200
    body = r.json()
    assert body["symbol"] == "NABIL" and len(body["bars"]) == len(bars)
    assert {i["name"] for i in body["indicators"]} == {"sma(5)", "rsi(5)"}
    assert {i["pane"] for i in body["indicators"]} == {"price", "oscillator"}
    assert all(len(i["values"]) == len(bars) for i in body["indicators"])
    a = body["anchor"]
    assert a["date"] == bars[200].trade_date.isoformat() and len(a["conditions"]) == 2
    assert a["fired"] == any(c["met"] for c in a["conditions"])
    f = body["forward"]
    assert f["entry_date"] == bars[201].trade_date.isoformat()
    assert [x["horizon"] for x in f["results"]] == [5, 10] and len(f["path"]) == 10
    assert f["bracket"]["outcome"] in {"target", "stop", "neither"}
    assert body["events"] and body["stats"]["events"] == len(body["events"])
    assert [h["horizon"] for h in body["stats"]["horizons"]] == [5, 10]


async def test_anchor_falls_back_to_previous_bar(post, bars):
    saturday = next(b.trade_date for b in bars[150:] if b.trade_date.weekday() == 4) + timedelta(days=1)
    body = (await post(anchor_date=saturday.isoformat())).json()
    assert body["anchor"]["date"] == (saturday - timedelta(days=1)).isoformat()
    assert body["anchor"]["requested_date"] == saturday.isoformat()
    assert any("previous trading day" in w for w in body["warnings"])


async def test_adjustment_is_applied_unrounded(client, override):
    bs = [Bar(date(2024, 1, 1) + timedelta(days=i), 100, 100, 100, 100.123, 900, 0.5) for i in range(5)]
    override(simulation.bar_source, FakeRepo(bs))
    r = await client.post("/api/v1/simulation/run", json={
        "symbol": "NABIL", "anchor_date": "2024-01-03", "horizons": [1],
        "rules": {"left": {"ind": "close"}, "op": ">", "right": 0}})
    b = r.json()["bars"][0]
    assert b["c"] == pytest.approx(50.0615) and b["v"] == 1800  # price x factor, volume / factor


async def test_anchor_on_last_bar_has_no_forward(post, bars):
    body = (await post(anchor_date=bars[-1].trade_date.isoformat())).json()
    assert body["forward"] is None and any("last bar" in w for w in body["warnings"])


async def test_unknown_symbol_is_404(post):
    assert (await post(symbol="NOPE")).status_code == 404


async def test_anchor_before_first_bar_is_422(post):
    assert (await post(anchor_date="2000-01-01")).status_code == 422


@pytest.mark.parametrize("patch", [
    {"rules": {"left": {"ind": "bogus"}, "op": ">", "right": 1}},
    {"rules": {"left": {"ind": "rsi", "n": 9999}, "op": ">", "right": 1}},
    {"rules": {"left": {"ind": "close"}, "op": "; DROP TABLE x", "right": 1}},
    {"rules": {"and": []}},
    {"rules": "close > 1"},
    {"horizons": []},
    {"horizons": [0]},
    {"horizons": list(range(1, 20))},
    {"target_pct": -1},
    {"stop_pct": 0},
    {"cost_pct": -0.1},
    {"anchor_date": "not-a-date"},
    {"symbol": ""},
])
async def test_bad_input_is_422(post, patch):
    assert (await post(**patch)).status_code == 422


async def test_no_look_ahead(bars):
    """Rewriting every bar after the anchor changes the future, never the anchor, events or stats."""
    idx = 200
    req = SimulationRequest("NABIL", bars[idx].trade_date, RULE, [5, 10, 20], target_pct=4, stop_pct=4)
    base = await run_simulation(FakeRepo(bars), req)
    wild = [replace(b, open=b.open * 3, high=b.high * 3 + 50, low=b.low / 3, close=b.close * 2 - 40, volume=1)
            if i > idx else b for i, b in enumerate(bars)]
    other = await run_simulation(FakeRepo(wild), req)
    assert other["anchor"] == base["anchor"]
    assert other["events"] == base["events"] and other["stats"] == base["stats"]
    assert other["forward"] != base["forward"]  # the future really did change
    assert base["events"] and all(e["entry_date"] <= base["anchor"]["date"] for e in base["events"])
    # a horizon that would reach past the anchor is left out, not peeked at
    assert max(r["horizon"] for e in base["events"] for r in e["results"]) <= 20
    last = base["events"][-1]
    assert len(last["results"]) < 3 or last["entry_date"] < base["anchor"]["date"]


async def test_events_window_and_stats_use_only_listed_events(bars):
    full = SimulationRequest("NABIL", bars[250].trade_date, RULE, [5])
    narrow = replace(full, events_from=bars[200].trade_date)
    a, b = await run_simulation(FakeRepo(bars), full), await run_simulation(FakeRepo(bars), narrow)
    assert len(b["events"]) < len(a["events"]) and all(e["date"] >= bars[200].trade_date.isoformat() for e in b["events"])
    rets = [e["results"][0]["ret"] for e in b["events"] if e["results"]]
    assert b["stats"]["horizons"][0]["count"] == len(rets)
    assert b["stats"]["horizons"][0]["win_rate"] == pytest.approx(sum(r > 0 for r in rets) / len(rets), abs=1e-4)


async def test_response_matches_the_frontend_fixture(client, override):
    """simulation_response.json is the stub the frontend builds against. Regenerate: UPDATE_FIXTURE=1 pytest -k fixture."""
    bs = make_bars(80)
    override(simulation.bar_source, FakeRepo(bs))
    body = {"symbol": "NABIL", "anchor_date": bs[50].trade_date.isoformat(), "rules": RULE, "horizons": [3, 5],
            "target_pct": 4, "stop_pct": 4, "cost_pct": 0.4}
    got = (await client.post("/api/v1/simulation/run", json=body)).json()
    if os.environ.get("UPDATE_FIXTURE"):
        FIXTURE.parent.mkdir(exist_ok=True)
        FIXTURE.write_text(json.dumps({"request": body, "response": got}, indent=1) + "\n")
    saved = json.loads(FIXTURE.read_text())
    assert saved == {"request": body, "response": got}
