from datetime import date

from nepse.application.ingestion.backfill import backfill

from .fakes import FakeHistory, FakeRepo

SINCE = date(2016, 1, 1)


async def test_backfill_skips_done_symbols_and_survives_failures():
    repo = FakeRepo()
    repo.earliest = {"HDL": date(2016, 1, 4)}  # already backfilled (within slack)
    source = FakeHistory(fail={"BAD"})
    report = await backfill(source, repo, SINCE)
    assert report.done == {"NABIL": 1}
    assert report.skipped == ["HDL"]
    assert set(report.failed) == {"BAD"}
    assert source.calls == ["NABIL", "BAD"]


async def test_explicit_symbols_override_active_list():
    source = FakeHistory()
    await backfill(source, FakeRepo(), SINCE, ["XYZ"])
    assert source.calls == ["XYZ"]
