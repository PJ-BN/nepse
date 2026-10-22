from datetime import date

from nepse.application.mutual_funds.ports import FundSnapshot
from nepse.application.mutual_funds.use_cases import list_mutual_funds

TODAY = date(2026, 1, 1)


class FakeRepo:
    async def snapshots(self):
        return [
            FundSnapshot("NOFUND", "No NAV", 10.0, None, None, None),
            FundSnapshot("SHALLOW", "Shallow", 9.0, 10.0, TODAY, date(2026, 6, 1)),     # 10% off: below 15%
            FundSnapshot("FLAGGED", "Flagged", 8.0, 10.0, TODAY, date(2026, 6, 1)),     # 20% off, matures soon
            FundSnapshot("FARAWAY", "Far away", 7.0, 10.0, TODAY, date(2030, 1, 1)),    # 30% off, matures later
        ]


async def test_list_mutual_funds_flags_and_orders():
    rows = await list_mutual_funds(FakeRepo(), TODAY)
    assert [r["symbol"] for r in rows] == ["FLAGGED", "FARAWAY", "SHALLOW", "NOFUND"]
    assert [r["flagged"] for r in rows] == [True, False, False, False]
    assert rows[0]["nav_discount_pct"] == -20.0 and rows[0]["days_to_maturity"] == 151
