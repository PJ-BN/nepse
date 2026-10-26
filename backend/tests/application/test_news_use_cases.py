from datetime import date
import pytest

from nepse.application.news.ports import NewsRepository, NewsSource
from nepse.application.news.use_cases import (
    generate_news_market_briefing,
    get_company_news,
    get_news_detail,
    get_news_feed,
    ingest_news,
)
from nepse.domain.news.entities import NewsItem


class FakeNewsRepository(NewsRepository):
    def __init__(self, items: list[NewsItem] | None = None):
        self.items: list[NewsItem] = items or []

    async def list_news(self, category=None, symbol=None, search=None, stance=None, limit=50, offset=0):
        res = self.items
        if category:
            res = [i for i in res if i.category.lower() == category.lower()]
        if symbol:
            res = [i for i in res if symbol.upper() in i.symbols]
        if search:
            q = search.lower()
            res = [i for i in res if q in i.title.lower() or q in i.summary.lower()]
        if stance:
            res = [i for i in res if i.impact_stance == stance.upper()]
        return res[offset : offset + limit]

    async def get_by_id(self, news_id: int):
        for i in self.items:
            if i.id == news_id:
                return i
        return None

    async def get_by_url(self, url: str):
        for i in self.items:
            if i.source_url == url:
                return i
        return None

    async def upsert_many(self, items: list[NewsItem]):
        count = 0
        existing_urls = {i.source_url for i in self.items}
        for item in items:
            if item.source_url not in existing_urls:
                self.items.append(item)
                count += 1
        return count

    async def count(self, category=None, symbol=None, search=None, stance=None):
        filtered = await self.list_news(category, symbol, search, stance, limit=9999, offset=0)
        return len(filtered)

    async def update_ai_analysis(self, news_id, impact_stance, impact_score, action_recommendation, action_detail, confidence):
        return None


class FakeNewsSource(NewsSource):
    def __init__(self, items: list[NewsItem]):
        self.items = items

    async def fetch(self):
        return self.items


@pytest.fixture
def sample_news():
    return [
        NewsItem(
            id=1,
            title="Nabil Bank declares 15% bonus",
            summary="Board meeting announces bonus shares.",
            source="ShareSansar",
            source_url="https://example.com/1",
            category="company",
            published_on=date(2026, 10, 26),
            symbols=["NABIL"],
            impact_stance="BULLISH",
            impact_score=60,
            action_recommendation="BUY BEFORE BOOK CLOSURE",
        ),
        NewsItem(
            id=2,
            title="SEBON clarifies margin lending directive",
            summary="New circular released for institutional borrowing.",
            source="SEBON",
            source_url="https://example.com/2",
            category="regulatory",
            published_on=date(2026, 10, 25),
            symbols=[],
            impact_stance="BULLISH",
            impact_score=70,
            action_recommendation="AGGRESSIVE RISK-ON",
        ),
        NewsItem(
            id=3,
            title="Everest Bank Q1 earnings report",
            summary="Everest Bank reports 12% rise in net profit.",
            source="MeroLagani",
            source_url="https://example.com/3",
            category="company",
            published_on=date(2026, 10, 24),
            symbols=["EBL"],
            impact_stance="BULLISH",
            impact_score=45,
            action_recommendation="ACCUMULATE ON WEAKNESS",
        ),
    ]


async def test_get_news_feed_all(sample_news):
    repo = FakeNewsRepository(sample_news)
    feed = await get_news_feed(repo)
    assert feed["total"] == 3
    assert len(feed["items"]) == 3


async def test_get_news_feed_filter_by_symbol(sample_news):
    repo = FakeNewsRepository(sample_news)
    feed = await get_news_feed(repo, symbol="NABIL")
    assert feed["total"] == 1
    assert feed["items"][0]["symbols"] == ["NABIL"]


async def test_get_news_feed_filter_by_category(sample_news):
    repo = FakeNewsRepository(sample_news)
    feed = await get_news_feed(repo, category="regulatory")
    assert feed["total"] == 1
    assert feed["items"][0]["source"] == "SEBON"


async def test_get_company_news(sample_news):
    repo = FakeNewsRepository(sample_news)
    items = await get_company_news(repo, "EBL")
    assert len(items) == 1
    assert items[0]["symbols"] == ["EBL"]


async def test_ingest_news(sample_news):
    repo = FakeNewsRepository()
    source = FakeNewsSource(sample_news)
    added = await ingest_news(source, repo)
    assert added == 3
    assert len(repo.items) == 3


async def test_generate_news_market_briefing(sample_news):
    repo = FakeNewsRepository(sample_news)
    briefing = await generate_news_market_briefing(repo)
    assert briefing["market_stance"] == "BULLISH"
    assert "Risk-On" in briefing["headline"]
