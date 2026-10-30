from collections.abc import AsyncIterator
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from nepse.application.chart_data import use_cases
from nepse.infrastructure.db.models_chart_data import SqlChartDataRepo
from nepse.infrastructure.db.session import SessionLocal
from nepse.presentation.api.schemas.chart_data import DrawingsIn, LayoutIn, LayoutsSyncIn
from nepse.presentation.api.v1.auth import current_user_id

router = APIRouter(prefix="/api/v1/user/chart", tags=["chart_data"])


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


# --- Drawings Endpoints ---


@router.get("/drawings/{symbol}", response_model=list[dict[str, Any]])
async def get_drawings(
    symbol: str,
    user_id: int = Depends(current_user_id),
    session: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    return await use_cases.get_user_drawings(SqlChartDataRepo(session), user_id, symbol)


@router.put("/drawings/{symbol}", response_model=list[dict[str, Any]])
async def save_drawings(
    symbol: str,
    body: DrawingsIn,
    user_id: int = Depends(current_user_id),
    session: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    return await use_cases.save_user_drawings(SqlChartDataRepo(session), user_id, symbol, body.drawings)


@router.delete("/drawings/{symbol}")
async def delete_drawings(
    symbol: str,
    user_id: int = Depends(current_user_id),
    session: AsyncSession = Depends(get_session),
) -> dict[str, bool]:
    deleted = await use_cases.delete_user_drawings(SqlChartDataRepo(session), user_id, symbol)
    return {"deleted": deleted}


# --- Layouts Endpoints ---


@router.get("/layouts", response_model=dict[str, Any])
async def get_layouts(
    user_id: int = Depends(current_user_id),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    return await use_cases.get_user_layouts(SqlChartDataRepo(session), user_id)


@router.put("/layouts/{name}", response_model=dict[str, Any])
async def save_layout(
    name: str,
    body: LayoutIn,
    user_id: int = Depends(current_user_id),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    return await use_cases.save_user_layout(SqlChartDataRepo(session), user_id, name, body.settings)


@router.delete("/layouts/{name}", response_model=dict[str, Any])
async def delete_layout(
    name: str,
    user_id: int = Depends(current_user_id),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await use_cases.delete_user_layout(SqlChartDataRepo(session), user_id, name)
    return await use_cases.get_user_layouts(SqlChartDataRepo(session), user_id)


@router.put("/layouts", response_model=dict[str, Any])
async def sync_layouts(
    body: LayoutsSyncIn,
    user_id: int = Depends(current_user_id),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    return await use_cases.sync_user_layouts(SqlChartDataRepo(session), user_id, body.layouts)
