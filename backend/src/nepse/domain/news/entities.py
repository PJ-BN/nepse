"""Domain entities for NEPSE news, regulatory bulletins, and AI impact analysis."""
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Literal

ImpactStance = Literal["BULLISH", "BEARISH", "NEUTRAL", "WATCH"]
SentimentLabel = Literal["POSITIVE", "NEGATIVE", "NEUTRAL"]
TimeHorizon = Literal["IMMEDIATE", "SHORT_TERM", "MEDIUM_TERM"]
NewsCategory = Literal["regulatory", "government", "company", "macro", "sector", "market"]


@dataclass(frozen=True)
class NewsItem:
    title: str
    summary: str
    source: str
    source_url: str
    category: str
    published_on: date
    symbols: list[str] = field(default_factory=list)
    sector: str | None = None
    content: str = ""
    impact_stance: ImpactStance = "NEUTRAL"
    impact_score: int = 0  # -100 to +100
    action_recommendation: str = "HOLD & MONITOR"
    action_detail: str = ""
    sentiment_label: SentimentLabel = "NEUTRAL"
    time_horizon: TimeHorizon = "SHORT_TERM"
    confidence: int = 80  # 0 to 100
    id: int | None = None
    created_at: datetime | None = None


@dataclass(frozen=True)
class NewsBriefing:
    headline: str
    market_stance: ImpactStance
    summary: str
    regulatory_takeaway: str
    top_opportunities: list[str]
    top_risks: list[str]
    sector_outlook: dict[str, str]
    generated_at: str
