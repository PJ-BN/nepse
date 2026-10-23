from pathlib import Path

from nepse.application.fundamentals.ingest_sector_metrics import ingest_sector_metrics
from nepse.application.fundamentals.ports import SectorReport, UpstreamError
from nepse.infrastructure.upstream.sharesansar_reports import parse_bfi_report
from tests.application.test_fundamentals_use_cases import SNAP, FakeRepo

FIX = Path(__file__).parent / "fixtures" / "sharesansar"


def test_parse_bank_report():
    r = parse_bfi_report((FIX / "quarterly_report_NABIL.html").read_text("utf-8"))
    assert (r.fy_bs, r.quarter) == ("2082/83", 4)
    assert r.metrics == {"car_pct": 12.37, "npl_pct": 4.2, "cost_of_funds_pct": 3.09, "cd_ratio_pct": 80.18,
                         "base_rate_pct": 4.44, "interest_spread_pct": 3.18}


def test_hydro_and_empty_reports_have_no_bfi_metrics():
    assert parse_bfi_report((FIX / "quarterly_report_AKPL.html").read_text("utf-8")) is None
    assert parse_bfi_report("<html></html>") is None


class Source:
    async def sector_report(self, symbol):
        if symbol == "BAD":
            raise UpstreamError("boom")
        return SectorReport("2082/83", 4, {"npl_pct": 4.2, "car_pct": 12.37})


async def test_ingest_stores_metrics_for_bfi_only():
    repo = FakeRepo()
    bank = await repo.create_company("NABIL", SNAP.name, "BANKING")
    await repo.create_company("BAD", "Bad Bank", "BANKING")
    await repo.create_company("AKPL", "Arun Kabeli", "HYDRO")
    assert await ingest_sector_metrics(["NABIL", "BAD", "AKPL", "NOPE"], repo, Source()) == 1
    row = repo.quarter_rows[bank.id][0]
    assert (row.fy_bs, row.quarter) == ("2082/83", 4)
    assert row.sector_metrics == {"npl_pct": 4.2, "car_pct": 12.37}
