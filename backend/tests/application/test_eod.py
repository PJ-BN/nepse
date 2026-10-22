from datetime import date

from nepse.application.ingestion.eod import run_eod

from .fakes import FakeRepo, FakeSource, tick


async def test_eod_loads_everything_and_is_idempotent():
    source = FakeSource(pages=[[tick(1), tick(2, buyer=58)], [tick(3, seller=42)]])
    repo = FakeRepo()
    report = await run_eod(source, repo)
    assert (report.business_date, report.daily_bars, report.index_bars, report.floorsheet_ticks) == ("2025-04-20", 1, 1, 3)
    assert report.unknown_symbols == {"NEWCO"}
    assert repo.brokers == {1: "B1", 2: "B2", 58: "B58", 42: "B42"}
    assert repo.refreshed == [(date(2025, 4, 20), date(2025, 4, 20))]

    rerun = await run_eod(source, repo)
    assert rerun.floorsheet_ticks == 0
