from datetime import date

from nepse.application.charting.ports import Bar
from nepse.application.charting.verify_adjusted import verify_adjusted


class Repo:
    async def bars(self, symbol, start, end):
        return [Bar(date(2026, 1, 1), 0, 0, 0, 100, 1, 0.9), Bar(date(2026, 1, 2), 0, 0, 0, 100, 1, 0.9),
                Bar(date(2026, 1, 5), 0, 0, 0, 100, 1, 1.0)]


class Ref:
    async def adjusted_closes(self, symbol, start, end):
        if symbol == "BAD":
            raise RuntimeError("blocked")
        return {date(2026, 1, 1): 90.0, date(2026, 1, 2): 91.0, date(2026, 1, 9): 5.0}  # 01-05 missing, 01-09 not ours


async def test_deviation_report_and_failure_isolation():
    reports = await verify_adjusted(Repo(), Ref(), ["BAD", "NABIL"], date(2026, 1, 1), date(2026, 1, 31), 0.5)
    assert [r.symbol for r in reports] == ["NABIL"]
    r = reports[0]
    assert r.compared == 2
    assert round(r.max_pct, 2) == 1.10 and round(r.mean_pct, 2) == 0.55
    assert [b.trade_date for b in r.breaches] == [date(2026, 1, 2)]
