from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from nepse.application.floorsheet import analytics as uc
from nepse.infrastructure.db.repositories.floorsheet import SqlFloorsheetRepository
from nepse.infrastructure.db.session import SessionLocal

router = APIRouter(prefix="/api/v1/floorsheet", tags=["floorsheet"])


async def get_repo() -> AsyncIterator[SqlFloorsheetRepository]:
    async with SessionLocal() as session:
        yield SqlFloorsheetRepository(session)


Repo = Annotated[SqlFloorsheetRepository, Depends(get_repo)]


@router.get("/analytics")
async def analytics(
    repo: Repo,
    symbol: str,
    days: Annotated[int, Query(ge=1, le=90)] = 30,
    broker_no: int | None = None,
    exclude_wash: bool = False,
) -> uc.BrokerAnalytics:
    try:
        return await uc.get_broker_analytics(repo, symbol, days, broker_no, exclude_wash)
    except LookupError:
        raise HTTPException(404, f"unknown symbol {symbol}") from None


@router.get("/broker/{broker_no}")
async def broker_profile(repo: Repo, broker_no: int) -> uc.BrokerProfile:
    return await uc.get_broker_profile(repo, broker_no)


@router.get("/accumulation")
async def accumulation(repo: Repo) -> list[uc.AccumulationHit]:
    return await uc.scan_accumulation(repo)


@router.get("/whales")
async def whales(repo: Repo, symbol: str | None = None, limit: Annotated[int, Query(ge=1, le=200)] = 50) -> list[dict]:
    return await uc.latest_whales(repo, symbol, limit)
