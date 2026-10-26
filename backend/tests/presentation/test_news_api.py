from datetime import date
import pytest

from nepse.domain.news.entities import NewsItem
from nepse.presentation.api.v1 import news


@pytest.fixture
def fake_news_item():
    return NewsItem(
        id=42,
        title="Nabil Bank declares 15% bonus",
        summary="Board announces 15% bonus dividend.",
        source="ShareSansar",
        source_url="https://example.com/nabil-bonus",
        category="company",
        published_on=date(2026, 10, 26),
        symbols=["NABIL"],
        sector="Commercial Banks",
        impact_stance="BULLISH",
        impact_score=60,
        action_recommendation="BUY BEFORE BOOK CLOSURE / ACCUMULATE",
        action_detail="Strong dividend catalyst for NABIL.",
        sentiment_label="POSITIVE",
        time_horizon="IMMEDIATE",
        confidence=85,
    )


async def test_news_api_list(client, monkeypatch, fake_news_item):
    class FakeRepo:
        def __init__(self, session):
            pass

        async def count(self, **kwargs):
            return 1

        async def list_news(self, **kwargs):
            return [fake_news_item]

    monkeypatch.setattr(news, "SqlNewsRepository", FakeRepo)
    res = await client.get("/api/v1/news", params={"symbol": "NABIL", "limit": 10})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["symbols"] == ["NABIL"]
    assert data["items"][0]["impact_stance"] == "BULLISH"


async def test_news_api_company_specific(client, monkeypatch, fake_news_item):
    class FakeRepo:
        def __init__(self, session):
            pass

        async def count(self, **kwargs):
            return 1

        async def list_news(self, symbol=None, **kwargs):
            return [fake_news_item] if symbol == "NABIL" else []

    monkeypatch.setattr(news, "SqlNewsRepository", FakeRepo)
    res = await client.get("/api/v1/news/company/NABIL")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["title"] == "Nabil Bank declares 15% bonus"


async def test_news_api_briefing(client, monkeypatch, fake_news_item):
    class FakeRepo:
        def __init__(self, session):
            pass

        async def count(self, **kwargs):
            return 1

        async def list_news(self, **kwargs):
            return [fake_news_item]

    monkeypatch.setattr(news, "SqlNewsRepository", FakeRepo)
    res = await client.get("/api/v1/news/briefing/latest")
    assert res.status_code == 200
    data = res.json()
    assert "headline" in data
    assert "market_stance" in data


async def test_news_api_detail_not_found(client, monkeypatch):
    class FakeRepo:
        def __init__(self, session):
            pass

        async def get_by_id(self, news_id):
            return None

    monkeypatch.setattr(news, "SqlNewsRepository", FakeRepo)
    res = await client.get("/api/v1/news/99999")
    assert res.status_code == 404
