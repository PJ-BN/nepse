from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from nepse.application.watchlist import use_cases
from nepse.infrastructure.db.models_watchlist import SqlWatchlistRepo
from nepse.infrastructure.db.session import SessionLocal
from nepse.presentation.api.schemas.watchlist import WatchlistSymbolIn, WatchlistSyncIn
from nepse.presentation.api.v1.auth import current_user_id

router = APIRouter(prefix="/api/v1/user/watchlist", tags=["watchlist"])


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


@router.get("", response_model=list[str])
async def get_watchlist(
    user_id: int = Depends(current_user_id),
    session: AsyncSession = Depends(get_session),
) -> list[str]:
    return await use_cases.get_user_watchlist(SqlWatchlistRepo(session), user_id)


@router.post("", response_model=list[str])
async def add_symbol(
    body: WatchlistSymbolIn,
    user_id: int = Depends(current_user_id),
    session: AsyncSession = Depends(get_session),
) -> list[str]:
    return await use_cases.add_to_watchlist(SqlWatchlistRepo(session), user_id, body.symbol)


@router.delete("/{symbol}", response_model=list[str])
async def remove_symbol(
    symbol: str,
    user_id: int = Depends(current_user_id),
    session: AsyncSession = Depends(get_session),
) -> list[str]:
    return await use_cases.remove_from_watchlist(SqlWatchlistRepo(session), user_id, symbol)


@router.put("", response_model=list[str])
async def sync_watchlist(
    body: WatchlistSyncIn,
    user_id: int = Depends(current_user_id),
    session: AsyncSession = Depends(get_session),
) -> list[str]:
    return await use_cases.sync_watchlist(SqlWatchlistRepo(session), user_id, body.symbols)
