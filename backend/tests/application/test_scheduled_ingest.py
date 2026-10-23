from datetime import date
from decimal import Decimal

from nepse.application.fundamentals.ingest_all import ingest_all, ingest_navs
from nepse.application.fundamentals.ports import FinancialSnapshot, NavRow, UpstreamError
from nepse.application.ingestion.crosscheck import crosscheck_eod
from nepse.application.ingestion.floorsheet_backfill import backfill_floorsheet
from nepse.domain.market.entities import DailyBar

from .fakes import FakeRepo, tick
from .test_fundamentals_use_cases import SNAP
from .test_fundamentals_use_cases import FakeRepo as FakeFundRepo

DAY = date(2026, 10, 15)  # a Thursday


def bar(symbol="NABIL", close="100", volume=10):
    p = Decimal(close)
    return DailyBar(symbol, DAY, p, p, p, p, None, volume, p, None)


class PriceSource:
    def __init__(self, bars):
        self.bars = bars

    async def today_prices(self):
        return self.bars


async def test_crosscheck_reports_mismatch_and_missing(caplog):
    repo = FakeRepo()

    async def stored(day):
        return [bar("NABIL", "100", 10), bar("HDL", "50", 5)]

    repo.daily_bars_on = stored
    report = await crosscheck_eod(PriceSource([bar("NABIL", "101", 10), bar("HDL", "50", 5), bar("NEW")]), repo)
    assert report.compared == 2
    assert len(report.mismatches) == 4 and all(m.startswith("NABIL") for m in report.mismatches)  # o/h/l/c, not volume
    assert report.missing_in_store == ["NEW"]
    assert "eod crosscheck" in caplog.text


class FloorsheetSource:
    def __init__(self):
        self.days = []

    async def floorsheet_on(self, day):
        self.days.append(day)
        yield [tick(day.day)]


async def test_floorsheet_backfill_skips_weekend_and_stored_days():
    repo = FakeRepo()

    async def have(start, end):
        return {date(2026, 10, 15)}

    repo.floorsheet_days = have
    source = FloorsheetSource()
    # Wed 14 .. Sun 18: Thu stored, Fri/Sat are not sessions -> only Wed and Sun
    done = await backfill_floorsheet(source, repo, date(2026, 10, 14), date(2026, 10, 18))
    assert source.days == [date(2026, 10, 14), date(2026, 10, 18)] and sum(done.values()) == 2
    assert repo.refreshed == [(date(2026, 10, 14), date(2026, 10, 18))]


class Source:
    def __init__(self, fail=()):
        self.fail = set(fail)

    async def financial_snapshot(self, symbol):
        if symbol in self.fail:
            raise UpstreamError("no eps")
        return FinancialSnapshot(**{**SNAP.__dict__, "symbol": symbol})

    async def dividends(self, symbol):
        return []


async def test_ingest_all_continues_past_failures():
    repo = FakeFundRepo()
    failed = await ingest_all(["NABIL", "NIBLMF", "HDL"], repo, [Source(fail={"NIBLMF"})])
    assert set(failed) == {"NIBLMF"} and {"NABIL", "HDL"} <= set(repo.companies)


async def test_ingest_navs_stores_known_symbols_only():
    repo = FakeFundRepo()
    await repo.create_company("NIBLPF", "NIBL Pragati", None)
    stored = {}

    async def upsert_navs(company_id, rows):
        stored[company_id] = rows
        return len(rows)

    repo.upsert_navs = upsert_navs

    class Navs:
        async def mutual_fund_navs(self):
            nav = NavRow(date(2026, 10, 15), 10.5, 10.4)
            return [("NIBLPF", nav), ("GHOST", nav)]

    assert await ingest_navs(Navs(), repo) == 1 and list(stored) == [1]


async def test_ingest_all_skips_non_equity():
    repo = FakeFundRepo()
    fund = await repo.create_company("NIBLPF", "Fund", None)
    fund.instrument_type = "MUTUAL_FUND"
    failed = await ingest_all(["NIBLPF", "NABIL"], repo, [Source(fail={"NIBLPF"})])
    assert failed == {} and "NABIL" in repo.companies
