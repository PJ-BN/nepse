from datetime import date

from nepse.application.calendar.ports import Announcement, DividendEvent
from nepse.application.calendar.use_cases import (
    get_book_closures, get_dividends, get_right_shares, ingest_announcements,
)


class FakeRepo:
    def __init__(self):
        self.calls, self.saved = [], []

    async def dividend_events(self, **kw):
        self.calls.append(kw)
        return [DividendEvent("NABIL", "Nabil", "2081/82", 0, 0, "1:0.5", date(2026, 11, 1), None),
                DividendEvent("NABIL", "Nabil", "2080/81", 10, 5, None, date(2025, 11, 1), None)]

    async def upsert_announcements(self, rows):
        self.saved = rows
        return len(rows)


class FakeSource:
    async def fetch(self):
        return [Announcement("t", "u", date(2026, 10, 17))]


async def test_dividends_skip_right_only_rows_and_uppercase_symbol():
    repo = FakeRepo()
    rows = await get_dividends(repo, "nabil")
    assert [r["fy_bs"] for r in rows] == ["2080/81"]
    assert repo.calls[0]["symbol"] == "NABIL"


async def test_rights_and_closures_window():
    repo = FakeRepo()
    assert len(await get_right_shares(repo)) == 2 and repo.calls[0]["rights_only"] is True
    await get_book_closures(repo, 30, today=date(2026, 10, 1))
    assert repo.calls[1]["closing_from"] == date(2026, 10, 1) and repo.calls[1]["closing_to"] == date(2026, 10, 31)


async def test_ingest_announcements():
    repo = FakeRepo()
    assert await ingest_announcements(FakeSource(), repo) == 1 and repo.saved[0].url == "u"
