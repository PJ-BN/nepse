"""User watchlist persistence."""
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from nepse.infrastructure.db.models import Base


class UserWatchlistRow(Base):
    __tablename__ = "user_watchlists"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    symbol: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SqlWatchlistRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_watchlist(self, user_id: int) -> list[str]:
        stmt = (
            select(UserWatchlistRow.symbol)
            .where(UserWatchlistRow.user_id == user_id)
            .order_by(UserWatchlistRow.id.asc())
        )
        result = await self.session.scalars(stmt)
        return list(result.all())

    async def add_symbol(self, user_id: int, symbol: str) -> bool:
        exists = await self.session.scalar(
            select(UserWatchlistRow.id).where(
                UserWatchlistRow.user_id == user_id,
                UserWatchlistRow.symbol == symbol,
            )
        )
        if exists:
            return False
        row = UserWatchlistRow(user_id=user_id, symbol=symbol)
        self.session.add(row)
        await self.session.commit()
        return True

    async def remove_symbol(self, user_id: int, symbol: str) -> bool:
        stmt = delete(UserWatchlistRow).where(
            UserWatchlistRow.user_id == user_id,
            UserWatchlistRow.symbol == symbol,
        )
        res = await self.session.execute(stmt)
        await self.session.commit()
        return bool(res.rowcount and res.rowcount > 0)

    async def set_watchlist(self, user_id: int, symbols: list[str]) -> list[str]:
        await self.session.execute(
            delete(UserWatchlistRow).where(UserWatchlistRow.user_id == user_id)
        )
        for s in symbols:
            self.session.add(UserWatchlistRow(user_id=user_id, symbol=s))
        await self.session.commit()
        return await self.get_watchlist(user_id)
