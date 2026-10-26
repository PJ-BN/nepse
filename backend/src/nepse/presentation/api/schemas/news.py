"""Schemas for news endpoints."""
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


class NewsItemDto(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    title: str
    summary: str
    content: str = ""
    source: str
    source_url: str
    category: str
    published_on: date
    symbols: list[str] = []
    sector: str | None = None
    impact_stance: str = "NEUTRAL"
    impact_score: int = 0
    action_recommendation: str = "HOLD & MONITOR"
    action_detail: str = ""
    sentiment_label: str = "NEUTRAL"
    time_horizon: str = "SHORT_TERM"
    confidence: int = 80
    created_at: datetime | None = None


class NewsFeedResponse(BaseModel):
    items: list[NewsItemDto]
    total: int
    limit: int
    offset: int
    category: str | None = None
    symbol: str | None = None


class NewsBriefingResponse(BaseModel):
    headline: str
    market_stance: str
    summary: str
    regulatory_takeaway: str
    top_opportunities: list[str]
    top_risks: list[str]
    sector_outlook: dict[str, str]
    generated_at: str


class NewsAnalyzeRequest(BaseModel):
    news_id: int | None = None
    title: str | None = None
    summary: str | None = None
