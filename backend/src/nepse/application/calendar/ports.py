"""Ports and records for dividend / right-share / book-closure listings and the announcements feed."""
from dataclasses import dataclass
from datetime import date
from typing import Protocol


@dataclass(frozen=True)
class DividendEvent:
    symbol: str
    name: str
    fy_bs: str
    bonus_pct: float
    cash_pct: float
    right_ratio: str | None
    book_closure_date: date | None
    announced_on: date | None


@dataclass(frozen=True)
class Announcement:
    title: str
    url: str
    published_on: date


class CalendarRepository(Protocol):
    async def dividend_events(
        self, *, symbol: str | None = None, rights_only: bool = False, closing_from: date | None = None,
        closing_to: date | None = None, limit: int = 100,
    ) -> list[DividendEvent]:
        """Newest book closure first (undated last), or soonest first when `closing_from` is set."""
        ...

    async def upsert_announcements(self, rows: list[Announcement]) -> int: ...

    async def announcements(self, limit: int) -> list[Announcement]: ...


class AnnouncementSource(Protocol):
    async def fetch(self) -> list[Announcement]: ...
