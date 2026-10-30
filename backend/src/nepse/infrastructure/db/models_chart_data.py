"""User chart drawings and layouts persistence."""
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Integer, String, delete, func, select
from sqlalchemy.dialects.postgresql import JSONB, insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from nepse.infrastructure.db.models import Base


class UserChartDrawingRow(Base):
    __tablename__ = "user_chart_drawings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    symbol: Mapped[str] = mapped_column(String(20))
    drawings: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class UserChartLayoutRow(Base):
    __tablename__ = "user_chart_layouts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    name: Mapped[str] = mapped_column(String(64))
    settings: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class SqlChartDataRepo:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_drawings(self, user_id: int, symbol: str) -> list[dict[str, Any]]:
        stmt = select(UserChartDrawingRow.drawings).where(
            UserChartDrawingRow.user_id == user_id,
            UserChartDrawingRow.symbol == symbol,
        )
        res = await self.session.scalar(stmt)
        return list(res) if res is not None else []

    async def save_drawings(
        self, user_id: int, symbol: str, drawings: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        stmt = (
            insert(UserChartDrawingRow)
            .values(
                user_id=user_id,
                symbol=symbol,
                drawings=drawings,
                updated_at=func.now(),
            )
            .on_conflict_do_update(
                constraint="uq_user_chart_drawings",
                set_={
                    "drawings": drawings,
                    "updated_at": func.now(),
                },
            )
        )
        await self.session.execute(stmt)
        await self.session.commit()
        return drawings

    async def delete_drawings(self, user_id: int, symbol: str) -> bool:
        stmt = delete(UserChartDrawingRow).where(
            UserChartDrawingRow.user_id == user_id,
            UserChartDrawingRow.symbol == symbol,
        )
        res = await self.session.execute(stmt)
        await self.session.commit()
        return bool(res.rowcount and res.rowcount > 0)

    async def get_layouts(self, user_id: int) -> dict[str, Any]:
        stmt = (
            select(UserChartLayoutRow.name, UserChartLayoutRow.settings)
            .where(UserChartLayoutRow.user_id == user_id)
            .order_by(UserChartLayoutRow.name.asc())
        )
        rows = await self.session.execute(stmt)
        return {name: settings for name, settings in rows}

    async def save_layout(
        self, user_id: int, name: str, settings: dict[str, Any]
    ) -> dict[str, Any]:
        stmt = (
            insert(UserChartLayoutRow)
            .values(
                user_id=user_id,
                name=name,
                settings=settings,
                updated_at=func.now(),
            )
            .on_conflict_do_update(
                constraint="uq_user_chart_layouts",
                set_={
                    "settings": settings,
                    "updated_at": func.now(),
                },
            )
        )
        await self.session.execute(stmt)
        await self.session.commit()
        return await self.get_layouts(user_id)

    async def delete_layout(self, user_id: int, name: str) -> bool:
        stmt = delete(UserChartLayoutRow).where(
            UserChartLayoutRow.user_id == user_id,
            UserChartLayoutRow.name == name,
        )
        res = await self.session.execute(stmt)
        await self.session.commit()
        return bool(res.rowcount and res.rowcount > 0)

    async def sync_layouts(self, user_id: int, layouts: dict[str, Any]) -> dict[str, Any]:
        await self.session.execute(
            delete(UserChartLayoutRow).where(UserChartLayoutRow.user_id == user_id)
        )
        for name, settings in layouts.items():
            self.session.add(
                UserChartLayoutRow(
                    user_id=user_id,
                    name=name,
                    settings=settings if isinstance(settings, dict) else {},
                )
            )
        await self.session.commit()
        return await self.get_layouts(user_id)
