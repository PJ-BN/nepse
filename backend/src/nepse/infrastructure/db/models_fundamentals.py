"""SQLAlchemy models for the tables created in migration 0002_fundamentals."""
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Integer, Numeric, SmallInteger, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from nepse.infrastructure.db.models import Base


class QuarterlyFinancials(Base):
    __tablename__ = "quarterly_financials"
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), primary_key=True)
    fy_bs: Mapped[str] = mapped_column(Text, primary_key=True)
    quarter: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    period_end: Mapped[date] = mapped_column(Date)
    paid_up_capital: Mapped[Decimal | None] = mapped_column(Numeric(20, 2))
    reserves: Mapped[Decimal | None] = mapped_column(Numeric(20, 2))
    net_profit: Mapped[Decimal | None] = mapped_column(Numeric(20, 2))
    eps: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    bvps: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    total_assets: Mapped[Decimal | None] = mapped_column(Numeric(20, 2))
    total_debt: Mapped[Decimal | None] = mapped_column(Numeric(20, 2))
    cash: Mapped[Decimal | None] = mapped_column(Numeric(20, 2))
    distributable_profit: Mapped[Decimal | None] = mapped_column(Numeric(20, 2))
    sector_metrics: Mapped[dict | None] = mapped_column(JSONB(none_as_null=True))  # None -> SQL NULL so upserts can COALESCE


class Dividend(Base):
    __tablename__ = "dividends"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    fy_bs: Mapped[str] = mapped_column(Text)
    bonus_pct: Mapped[Decimal] = mapped_column(Numeric(8, 4), default=0)
    cash_pct: Mapped[Decimal] = mapped_column(Numeric(8, 4), default=0)
    right_ratio: Mapped[str | None] = mapped_column(Text)
    book_closure_date: Mapped[date | None] = mapped_column(Date)
    announced_on: Mapped[date | None] = mapped_column(Date)


class MutualFundNav(Base):
    __tablename__ = "mutual_fund_nav"
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), primary_key=True)
    nav_date: Mapped[date] = mapped_column(Date, primary_key=True)
    weekly_nav: Mapped[Decimal | None] = mapped_column(Numeric(12, 4))
    monthly_nav: Mapped[Decimal | None] = mapped_column(Numeric(12, 4))
    maturity_date: Mapped[date | None] = mapped_column(Date)
