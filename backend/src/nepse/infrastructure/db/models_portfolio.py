"""Tables from migration 0002_portfolio, plus the SQL/Redis adapters for the auth and portfolio ports."""
import json
from datetime import date, datetime
from decimal import Decimal

from redis.asyncio import Redis
from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, Text, func, select
from sqlalchemy.dialects.postgresql import ENUM, JSONB
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from nepse.application.auth.ports import EmailTaken, User
from nepse.application.portfolio.ports import Quote, StoredTxn
from nepse.domain.portfolio.wacc import Txn, TxnType
from nepse.infrastructure.db.models import Base, Company, OhlcvDaily

LIVE_QUOTES_KEY = "nepse:live:quotes"


class UserRow(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(Text, unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PortfolioTxn(Base):
    __tablename__ = "portfolio_txns"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    txn_type: Mapped[str] = mapped_column(ENUM(*TxnType, name="portfolio_txn_type", create_type=False))
    qty: Mapped[int] = mapped_column(Integer)
    rate: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    txn_date: Mapped[date] = mapped_column(Date)
    fees: Mapped[dict] = mapped_column(JSONB, default=dict)


class SqlUserRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_email(self, email: str) -> User | None:
        row = await self.session.scalar(select(UserRow).where(UserRow.email == email))
        return User(row.id, row.email, row.password_hash, row.created_at) if row else None

    async def get_by_id(self, user_id: int) -> User | None:
        row = await self.session.scalar(select(UserRow).where(UserRow.id == user_id))
        return User(row.id, row.email, row.password_hash, row.created_at) if row else None

    async def add(self, email: str, password_hash: str) -> int:
        row = UserRow(email=email, password_hash=password_hash)
        self.session.add(row)
        try:
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raise EmailTaken(email) from None
        return row.id


class SqlTxnRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def symbol_exists(self, symbol: str) -> bool:
        return await self.session.scalar(select(Company.id).where(Company.symbol == symbol)) is not None

    async def list_for_user(self, user_id: int) -> list[StoredTxn]:
        rows = await self.session.execute(
            select(PortfolioTxn, Company.symbol).join(Company, Company.id == PortfolioTxn.company_id)
            .where(PortfolioTxn.user_id == user_id).order_by(PortfolioTxn.txn_date, PortfolioTxn.id)
        )
        return [StoredTxn(t.id, sym, Txn(TxnType(t.txn_type), t.qty, t.rate, t.txn_date), t.fees) for t, sym in rows]

    async def add(self, user_id: int, symbol: str, txn: Txn, fees: dict) -> int:
        company_id = await self.session.scalar(select(Company.id).where(Company.symbol == symbol))
        row = PortfolioTxn(user_id=user_id, company_id=company_id, txn_type=txn.kind.value, qty=txn.qty,
                           rate=txn.rate, txn_date=txn.on, fees=fees)
        self.session.add(row)
        await self.session.commit()
        return row.id


class LivePriceSource:
    """Redis live quotes (written by ingestion), falling back to the latest ohlcv_daily close."""

    def __init__(self, session: AsyncSession, redis: Redis):
        self.session, self.redis = session, redis

    async def quotes(self, symbols: list[str]) -> dict[str, Quote]:
        if not symbols:
            return {}
        out: dict[str, Quote] = {}
        try:
            for sym, raw in zip(symbols, await self.redis.hmget(LIVE_QUOTES_KEY, symbols)):
                if raw and (q := json.loads(raw)).get("ltp") is not None:
                    prev = q.get("prev_close")
                    out[sym] = Quote(Decimal(str(q["ltp"])), Decimal(str(prev)) if prev is not None else None)
        except Exception:  # live feed down: EOD prices are still a correct answer
            pass
        missing = [s for s in symbols if s not in out]
        if missing:
            rows = await self.session.execute(
                select(Company.symbol, OhlcvDaily.close, OhlcvDaily.prev_close)
                .join(OhlcvDaily, OhlcvDaily.company_id == Company.id)
                .where(Company.symbol.in_(missing), OhlcvDaily.close.is_not(None))
                .order_by(Company.symbol, OhlcvDaily.trade_date.desc())
                .distinct(Company.symbol)
            )
            out |= {sym: Quote(close, prev) for sym, close, prev in rows}
        return out
