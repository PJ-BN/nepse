"""Chart overlays specific to NEPSE: circuit-limit lines, corporate-action markers, volume profile."""
from collections.abc import AsyncIterator
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from nepse.application.nepse_layers import use_cases as uc
from nepse.infrastructure.db.repositories.calendar import SqlCalendarRepository
from nepse.infrastructure.db.repositories.nepse_layers import SqlNepseLayersRepository
from nepse.infrastructure.db.session import SessionLocal

router = APIRouter(prefix="/api/v1/nepse", tags=["nepse-layers"])


async def layers_repo() -> AsyncIterator[SqlNepseLayersRepository]:
    async with SessionLocal() as s:
        yield SqlNepseLayersRepository(s)


async def calendar_repo() -> AsyncIterator[SqlCalendarRepository]:
    async with SessionLocal() as s:
        yield SqlCalendarRepository(s)


@router.get("/circuit-limits")
async def circuit_limits(
    symbol: str, from_: Annotated[date, Query(alias="from")], to: date, adjusted: bool = True,
    repo: SqlNepseLayersRepository = Depends(layers_repo),
) -> list[dict]:
    return await uc.get_circuit_limits(repo, symbol.upper(), from_, to, adjusted)


@router.get("/corporate-actions")
async def corporate_actions(symbol: str, repo: SqlCalendarRepository = Depends(calendar_repo)) -> list[dict]:
    return await uc.get_corporate_actions(repo, symbol.upper())


@router.get("/volume-profile")
async def volume_profile(
    symbol: str, from_: Annotated[date, Query(alias="from")], to: date, bins: Annotated[int, Query(ge=2, le=100)] = 24,
    repo: SqlNepseLayersRepository = Depends(layers_repo),
) -> dict:
    return await uc.get_volume_profile(repo, symbol.upper(), from_, to, bins)
