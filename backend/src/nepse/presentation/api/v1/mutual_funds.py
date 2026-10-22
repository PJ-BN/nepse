from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from nepse.application.mutual_funds.use_cases import list_mutual_funds
from nepse.infrastructure.db.repositories.mutual_funds import SqlMutualFundRepository
from nepse.presentation.api.schemas.mutual_funds import MutualFundOut
from nepse.presentation.api.v1.screener import get_session

router = APIRouter(prefix="/api/v1/mutual-funds", tags=["mutual-funds"])


@router.get("", response_model=list[MutualFundOut])
async def mutual_funds(session: AsyncSession = Depends(get_session)):
    return await list_mutual_funds(SqlMutualFundRepository(session), date.today())
