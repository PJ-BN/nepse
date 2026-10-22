import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from nepse.application.calendar.ports import Announcement, DividendEvent
from nepse.infrastructure.db.models import Company
from nepse.infrastructure.db.models_calendar import AnnouncementRow
from nepse.infrastructure.db.models_fundamentals import Dividend


class SqlCalendarRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def dividend_events(self, *, symbol=None, rights_only=False, closing_from=None, closing_to=None,
                              limit=100) -> list[DividendEvent]:
        q = sa.select(Company.symbol, Company.name, Dividend).join(Company, Company.id == Dividend.company_id)
        if symbol:
            q = q.where(Company.symbol == symbol)
        if rights_only:
            q = q.where(Dividend.right_ratio.is_not(None), Dividend.right_ratio != "")
        if closing_from is not None:
            q = q.where(Dividend.book_closure_date >= closing_from, Dividend.book_closure_date <= closing_to)
            q = q.order_by(Dividend.book_closure_date, Company.symbol)
        else:
            q = q.order_by(Dividend.book_closure_date.desc().nulls_last(), Company.symbol)
        return [
            DividendEvent(sym, name, d.fy_bs, float(d.bonus_pct), float(d.cash_pct), d.right_ratio,
                          d.book_closure_date, d.announced_on)
            for sym, name, d in await self.session.execute(q.limit(limit))
        ]

    async def upsert_announcements(self, rows: list[Announcement]) -> int:
        unique = {r.url: {"url": r.url, "title": r.title, "published_on": r.published_on} for r in rows}
        if not unique:
            return 0
        stmt = insert(AnnouncementRow).values(list(unique.values())).on_conflict_do_nothing(index_elements=["url"])
        await self.session.execute(stmt)
        await self.session.commit()
        return len(unique)

    async def announcements(self, limit: int) -> list[Announcement]:
        q = (sa.select(AnnouncementRow.title, AnnouncementRow.url, AnnouncementRow.published_on)
             .order_by(AnnouncementRow.published_on.desc(), AnnouncementRow.id.desc()).limit(limit))
        return [Announcement(*r) for r in await self.session.execute(q)]
