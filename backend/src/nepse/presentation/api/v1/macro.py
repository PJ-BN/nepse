from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from nepse.application.macro.use_cases import get_ipo_pipeline, get_macro_radar, get_rrg
from nepse.infrastructure.db.repositories.macro import SqlMacroRepository
from nepse.presentation.api.v1.screener import get_session

router = APIRouter(prefix="/api/v1/macro", tags=["macro"])


@router.get("/radar")
async def radar(days: int = Query(365, ge=30, le=3650), session: AsyncSession = Depends(get_session)):
    return await get_macro_radar(SqlMacroRepository(session), days)


@router.get("/rrg")
async def rrg(timeframe: Literal["daily", "weekly"] = "daily", tail: int = Query(8, ge=1, le=30),
              session: AsyncSession = Depends(get_session)):
    return await get_rrg(SqlMacroRepository(session), timeframe, tail)


@router.get("/ipo-pipeline")
async def ipo_pipeline(session: AsyncSession = Depends(get_session)):
    return await get_ipo_pipeline(SqlMacroRepository(session))
