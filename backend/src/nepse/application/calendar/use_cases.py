"""Calendar use cases: dividend history, right shares, upcoming book closures, announcements ingestion."""
from dataclasses import asdict
from datetime import date, timedelta

from nepse.application.calendar.ports import AnnouncementSource, CalendarRepository


async def get_dividends(repo: CalendarRepository, symbol: str | None = None, limit: int = 100) -> list[dict]:
    rows = await repo.dividend_events(symbol=symbol.upper() if symbol else None, limit=limit)
    return [asdict(r) for r in rows if r.bonus_pct or r.cash_pct]


async def get_right_shares(repo: CalendarRepository, symbol: str | None = None, limit: int = 100) -> list[dict]:
    rows = await repo.dividend_events(symbol=symbol.upper() if symbol else None, rights_only=True, limit=limit)
    return [asdict(r) for r in rows]


async def get_book_closures(repo: CalendarRepository, days: int = 60, today: date | None = None) -> list[dict]:
    """Book closures from today through `days` ahead, soonest first."""
    start = today or date.today()
    rows = await repo.dividend_events(closing_from=start, closing_to=start + timedelta(days=days), limit=500)
    return [asdict(r) for r in rows]


async def get_announcements(repo: CalendarRepository, limit: int = 50) -> list[dict]:
    return [asdict(a) for a in await repo.announcements(limit)]


async def ingest_announcements(source: AnnouncementSource, repo: CalendarRepository) -> int:
    """Scheduler job (hourly)."""
    return await repo.upsert_announcements(await source.fetch())
