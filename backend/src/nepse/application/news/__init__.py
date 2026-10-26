"""News application use cases and ports."""
from nepse.application.news.ports import NewsRepository, NewsSource
from nepse.application.news.use_cases import (
    generate_news_market_briefing,
    get_company_news,
    get_news_detail,
    get_news_feed,
    ingest_news,
)

__all__ = [
    "NewsRepository",
    "NewsSource",
    "generate_news_market_briefing",
    "get_company_news",
    "get_news_detail",
    "get_news_feed",
    "ingest_news",
]
