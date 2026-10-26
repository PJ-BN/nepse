"""SQLAlchemy model for news articles and regulatory bulletins."""
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from nepse.infrastructure.db.models import Base


class NewsRow(Base):
    __tablename__ = "news_articles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, default="", nullable=False)
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    source_url: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    published_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    symbols: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    sector: Mapped[str | None] = mapped_column(String(64), nullable=True)
    impact_stance: Mapped[str] = mapped_column(String(32), default="NEUTRAL", nullable=False, index=True)
    impact_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    action_recommendation: Mapped[str] = mapped_column(String(64), default="HOLD & MONITOR", nullable=False)
    action_detail: Mapped[str] = mapped_column(Text, default="", nullable=False)
    sentiment_label: Mapped[str] = mapped_column(String(32), default="NEUTRAL", nullable=False)
    time_horizon: Mapped[str] = mapped_column(String(32), default="SHORT_TERM", nullable=False)
    confidence: Mapped[int] = mapped_column(Integer, default=80, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
