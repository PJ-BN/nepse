from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from nepse.application.breadth.get_breadth import get_breadth
from nepse.infrastructure.db.repositories.screener import SqlScreenerRepository
from nepse.presentation.api.v1.screener import get_session

router = APIRouter(prefix="/api/v1", tags=["breadth"])


@router.get("/breadth")
async def breadth(session: AsyncSession = Depends(get_session)):
    result = await get_breadth(SqlScreenerRepository(session))
    if result is None:
        raise HTTPException(404, "no price history yet")
    return result
