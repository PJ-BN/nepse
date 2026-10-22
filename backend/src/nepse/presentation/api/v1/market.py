from datetime import datetime

from fastapi import APIRouter

from nepse.application.market.get_market_summary import MarketSummary, get_market_summary
from nepse.domain.calendar.npt import NPT
from nepse.infrastructure.cache.live_market import RedisLiveMarketSource
from nepse.infrastructure.cache.redis_client import redis
from nepse.infrastructure.db.repositories.market import SqlEodMarketSource
from nepse.infrastructure.db.session import SessionLocal

router = APIRouter(prefix="/api/v1/market", tags=["market"])


@router.get("/summary")
async def summary() -> MarketSummary:
    async with SessionLocal() as s:
        return await get_market_summary(RedisLiveMarketSource(redis), SqlEodMarketSource(s), datetime.now(NPT))
