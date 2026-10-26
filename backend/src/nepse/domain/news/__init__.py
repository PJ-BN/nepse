"""News domain: entities and analyzers for financial market news, regulatory updates, and investor actions."""
from nepse.domain.news.analyzer import analyze_news, detect_category, detect_sector, extract_symbols
from nepse.domain.news.entities import ImpactStance, NewsBriefing, NewsCategory, NewsItem, SentimentLabel, TimeHorizon

__all__ = [
    "ImpactStance",
    "NewsBriefing",
    "NewsCategory",
    "NewsItem",
    "SentimentLabel",
    "TimeHorizon",
    "analyze_news",
    "detect_category",
    "detect_sector",
    "extract_symbols",
]
