"""SQLAlchemy models for the core tables created in migration 0001.

Feature branches add their own tables in their own module (e.g. models_fundamentals.py) on the same Base,
so parallel branches never edit this file.
"""
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Integer, Numeric, SmallInteger, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Sector(Base):
    __tablename__ = "sectors"
    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    code: Mapped[str] = mapped_column(Text, unique=True)
    name: Mapped[str] = mapped_column(Text)
    index_code: Mapped[str] = mapped_column(Text)


class Company(Base):
    __tablename__ = "companies"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    symbol: Mapped[str] = mapped_column(String(20), unique=True)
    nepse_id: Mapped[int | None] = mapped_column(Integer, unique=True)
    name: Mapped[str] = mapped_column(Text)
    sector_id: Mapped[int | None] = mapped_column(ForeignKey("sectors.id"))
    instrument_type: Mapped[str] = mapped_column(Text, default="EQUITY")  # PG enum instrument_type
    listed_shares: Mapped[int | None] = mapped_column(BigInteger)
    public_shares: Mapped[int | None] = mapped_column(BigInteger)
    promoter_shares: Mapped[int | None] = mapped_column(BigInteger)
    paid_up_capital: Mapped[Decimal | None] = mapped_column(Numeric(20, 2))
    listing_date: Mapped[date | None] = mapped_column(Date)
    promoter_lockin_expiry: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(Text, default="ACTIVE")


class Broker(Base):
    __tablename__ = "brokers"
    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    name: Mapped[str] = mapped_column(Text)


class CorporateAction(Base):
    __tablename__ = "corporate_actions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    fiscal_year_bs: Mapped[str | None] = mapped_column(Text)
    bonus_pct: Mapped[Decimal] = mapped_column(Numeric(8, 4), default=0)
    right_pct: Mapped[Decimal] = mapped_column(Numeric(8, 4), default=0)
    cash_pct: Mapped[Decimal] = mapped_column(Numeric(8, 4), default=0)
    book_closure_date: Mapped[date] = mapped_column(Date)
    adj_factor: Mapped[Decimal | None] = mapped_column(Numeric(14, 10))


class OhlcvDaily(Base):
    __tablename__ = "ohlcv_daily"
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), primary_key=True)
    trade_date: Mapped[date] = mapped_column(Date, primary_key=True)
    open: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    high: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    low: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    close: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    prev_close: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    volume: Mapped[int | None] = mapped_column(BigInteger)
    turnover: Mapped[Decimal | None] = mapped_column(Numeric(20, 2))
    transactions: Mapped[int | None] = mapped_column(Integer)
    adj_factor: Mapped[Decimal] = mapped_column(Numeric(14, 10), default=1)


class IndexDaily(Base):
    __tablename__ = "index_daily"
    index_code: Mapped[str] = mapped_column(Text, primary_key=True)
    trade_date: Mapped[date] = mapped_column(Date, primary_key=True)
    open: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    high: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    low: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    close: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    turnover: Mapped[Decimal | None] = mapped_column(Numeric(20, 2))


class FloorsheetTick(Base):
    __tablename__ = "floorsheet_ticks"
    contract_no: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    trade_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    buyer_broker: Mapped[int] = mapped_column(SmallInteger)
    seller_broker: Mapped[int] = mapped_column(SmallInteger)
    qty: Mapped[int] = mapped_column(Integer)
    rate: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
