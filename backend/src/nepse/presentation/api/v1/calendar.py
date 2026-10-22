from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from nepse.application.calendar.use_cases import (
    get_announcements, get_book_closures, get_dividends, get_right_shares,
)
from nepse.infrastructure.db.repositories.calendar import SqlCalendarRepository
from nepse.presentation.api.v1.screener import get_session

router = APIRouter(prefix="/api/v1/calendar", tags=["calendar"])


@router.get("/dividends")
async def dividends(symbol: str | None = None, limit: int = Query(100, ge=1, le=500),
                    session: AsyncSession = Depends(get_session)):
    return await get_dividends(SqlCalendarRepository(session), symbol, limit)


@router.get("/rights")
async def rights(symbol: str | None = None, limit: int = Query(100, ge=1, le=500),
                 session: AsyncSession = Depends(get_session)):
    return await get_right_shares(SqlCalendarRepository(session), symbol, limit)


@router.get("/book-closures")
async def book_closures(days: int = Query(60, ge=1, le=365), session: AsyncSession = Depends(get_session)):
    return await get_book_closures(SqlCalendarRepository(session), days)


@router.get("/announcements")
async def announcements(limit: int = Query(50, ge=1, le=200), session: AsyncSession = Depends(get_session)):
    return await get_announcements(SqlCalendarRepository(session), limit)
