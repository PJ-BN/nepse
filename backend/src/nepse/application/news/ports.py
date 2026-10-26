"""Ports and protocols for financial news, regulatory bulletins, and AI impact analysis."""
from typing import Protocol

from nepse.domain.news.entities import NewsBriefing, NewsItem


class NewsRepository(Protocol):
    async def list_news(
        self,
        category: str | None = None,
        symbol: str | None = None,
        search: str | None = None,
        stance: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[NewsItem]: ...

    async def get_by_id(self, news_id: int) -> NewsItem | None: ...

    async def get_by_url(self, url: str) -> NewsItem | None: ...

    async def upsert_many(self, items: list[NewsItem]) -> int: ...

    async def count(
        self,
        category: str | None = None,
        symbol: str | None = None,
        search: str | None = None,
        stance: str | None = None,
    ) -> int: ...

    async def update_ai_analysis(
        self,
        news_id: int,
        impact_stance: str,
        impact_score: int,
        action_recommendation: str,
        action_detail: str,
        confidence: int,
    ) -> NewsItem | None: ...


class NewsSource(Protocol):
    async def fetch(self) -> list[NewsItem]: ...
