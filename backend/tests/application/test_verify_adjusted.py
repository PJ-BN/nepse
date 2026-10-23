from datetime import date, timedelta

from nepse.application.charting.ports import Bar
from nepse.application.charting.verify_adjusted import verify_adjusted

DAYS = [date(2026, 1, 1) + timedelta(days=i) for i in range(30)]
RAW = [100.0 + i for i in range(30)]
STEP = 15  # our adj_factor steps 0.5 -> 1.0 at DAYS[15]


class Repo:
    async def bars(self, symbol, start, end):
        return [Bar(d, 0, 0, 0, c, 1, 0.5 if i < STEP else 1.0) for i, (d, c) in enumerate(zip(DAYS, RAW))]


class Ref:
    async def adjusted_closes(self, symbol, start, end):
        if symbol == "BAD":
            raise RuntimeError("blocked")
        if symbol == "IGNORES":  # reference skipped the adjustment entirely
            return dict(zip(DAYS, RAW))
        if symbol == "SCALED":  # not a plain adjustment (returns damped) but the factor jump agrees
            return {d: (c * 0.5 if i < STEP else c) * 0.9 for i, (d, c) in enumerate(zip(DAYS, RAW))}
        shift = 2 if symbol == "LATE" else 0  # steps a couple of days off ours
        return {d: c * (0.5 if i < STEP + shift else 1.0) for i, (d, c) in enumerate(zip(DAYS, RAW))}


async def test_factor_jump_decides_warning_and_failures_are_isolated():
    syms = ["BAD", "NABIL", "LATE", "IGNORES", "SCALED"]
    reports = {r.symbol: r for r in await verify_adjusted(Repo(), Ref(), syms, DAYS[0], DAYS[-1], 0.5)}
    assert set(reports) == {"NABIL", "LATE", "IGNORES", "SCALED"}
    assert not reports["NABIL"].breaches and reports["NABIL"].max_pct == 0
    assert not reports["LATE"].breaches  # window absorbs a step a few days off
    assert [b.trade_date for b in reports["IGNORES"].breaches] == [DAYS[STEP]]
    assert round(reports["IGNORES"].breaches[0].reference, 3) == 1.0 and round(reports["IGNORES"].breaches[0].ours, 3) == 2.0
    assert reports["SCALED"].max_pct > 0.5  # level differs, kept as a diagnostic only
