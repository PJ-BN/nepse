"""PostgreSQL / SQLAlchemy implementation of the NewsRepository port."""
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from nepse.application.news.ports import NewsRepository
from nepse.domain.news.entities import NewsItem
from nepse.infrastructure.db.models_news import NewsRow


def _to_item(row: NewsRow) -> NewsItem:
    return NewsItem(
        id=row.id,
        title=row.title,
        summary=row.summary,
        content=row.content,
        source=row.source,
        source_url=row.source_url,
        category=row.category,
        published_on=row.published_on,
        symbols=list(row.symbols or []),
        sector=row.sector,
        impact_stance=row.impact_stance,  # type: ignore
        impact_score=row.impact_score,
        action_recommendation=row.action_recommendation,
        action_detail=row.action_detail,
        sentiment_label=row.sentiment_label,  # type: ignore
        time_horizon=row.time_horizon,  # type: ignore
        confidence=row.confidence,
        created_at=row.created_at,
    )


class SqlNewsRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    def _apply_filters(
        self,
        q,
        category: str | None = None,
        symbol: str | None = None,
        search: str | None = None,
        stance: str | None = None,
    ):
        if category and category != "all":
            q = q.where(NewsRow.category == category.lower())
        if stance and stance != "ALL":
            q = q.where(NewsRow.impact_stance == stance.upper())
        if symbol:
            sym_clean = symbol.upper()
            # Compatible with both Postgres JSON/JSONB and SQLite text
            q = q.where(sa.cast(NewsRow.symbols, sa.Text).contains(f'"{sym_clean}"'))
        if search:
            pattern = f"%{search.strip()}%"
            q = q.where(
                sa.or_(
                    NewsRow.title.ilike(pattern),
                    NewsRow.summary.ilike(pattern),
                )
            )
        return q

    async def list_news(
        self,
        category: str | None = None,
        symbol: str | None = None,
        search: str | None = None,
        stance: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[NewsItem]:
        q = sa.select(NewsRow)
        q = self._apply_filters(q, category, symbol, search, stance)
        q = q.order_by(NewsRow.published_on.desc(), NewsRow.id.desc()).limit(limit).offset(offset)
        rows = (await self.session.execute(q)).scalars().all()
        return [_to_item(r) for r in rows]

    async def count(
        self,
        category: str | None = None,
        symbol: str | None = None,
        search: str | None = None,
        stance: str | None = None,
    ) -> int:
        q = sa.select(sa.func.count(NewsRow.id))
        q = self._apply_filters(q, category, symbol, search, stance)
        return (await self.session.scalar(q)) or 0

    async def get_by_id(self, news_id: int) -> NewsItem | None:
        q = sa.select(NewsRow).where(NewsRow.id == news_id)
        row = (await self.session.execute(q)).scalar_one_or_none()
        return _to_item(row) if row else None

    async def get_by_url(self, url: str) -> NewsItem | None:
        q = sa.select(NewsRow).where(NewsRow.source_url == url)
        row = (await self.session.execute(q)).scalar_one_or_none()
        return _to_item(row) if row else None

    async def upsert_many(self, items: list[NewsItem]) -> int:
        if not items:
            return 0
        records = []
        for item in items:
            records.append(
                {
                    "title": item.title,
                    "summary": item.summary,
                    "content": item.content,
                    "source": item.source,
                    "source_url": item.source_url,
                    "category": item.category,
                    "published_on": item.published_on,
                    "symbols": item.symbols,
                    "sector": item.sector,
                    "impact_stance": item.impact_stance,
                    "impact_score": item.impact_score,
                    "action_recommendation": item.action_recommendation,
                    "action_detail": item.action_detail,
                    "sentiment_label": item.sentiment_label,
                    "time_horizon": item.time_horizon,
                    "confidence": item.confidence,
                }
            )
        # Deduplicate within batch by source_url
        unique_by_url = {r["source_url"]: r for r in records}
        vals = list(unique_by_url.values())

        stmt = insert(NewsRow).values(vals).on_conflict_do_nothing(index_elements=["source_url"])
        await self.session.execute(stmt)
        await self.session.commit()
        return len(vals)

    async def update_ai_analysis(
        self,
        news_id: int,
        impact_stance: str,
        impact_score: int,
        action_recommendation: str,
        action_detail: str,
        confidence: int,
    ) -> NewsItem | None:
        stmt = (
            sa.update(NewsRow)
            .where(NewsRow.id == news_id)
            .values(
                impact_stance=impact_stance,
                impact_score=impact_score,
                action_recommendation=action_recommendation,
                action_detail=action_detail,
                confidence=confidence,
            )
            .returning(NewsRow)
        )
        row = (await self.session.execute(stmt)).scalar_one_or_none()
        await self.session.commit()
        return _to_item(row) if row else None
