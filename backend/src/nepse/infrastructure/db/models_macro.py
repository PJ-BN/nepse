"""Tables from migration 0002_screener_macro. mv_screener_snapshot is queried via the screener repository."""
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from nepse.infrastructure.db.models import Base


class MacroIndicator(Base):
    __tablename__ = "macro_indicators"
    indicator: Mapped[str] = mapped_column(Text, primary_key=True)
    obs_date: Mapped[date] = mapped_column(Date, primary_key=True)
    value: Mapped[float] = mapped_column(Float)
    source: Mapped[str] = mapped_column(Text)


class IpoPipeline(Base):
    __tablename__ = "ipo_pipeline"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company: Mapped[str] = mapped_column(Text)
    issue_type: Mapped[str] = mapped_column(Text)
    stage: Mapped[str] = mapped_column(Text)
    sector: Mapped[str | None] = mapped_column(Text)
    units: Mapped[float | None] = mapped_column(Float)
    amount: Mapped[float | None] = mapped_column(Float)
    issue_manager: Mapped[str | None] = mapped_column(Text)
    application_date_bs: Mapped[str | None] = mapped_column(Text)
    approval_date_bs: Mapped[str | None] = mapped_column(Text)
    as_of_bs: Mapped[str | None] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
