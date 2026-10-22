from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from nepse.infrastructure.cache.redis_client import redis
from nepse.infrastructure.db.session import engine

router = APIRouter()


@router.get("/healthz")
async def healthz() -> dict:
    try:
        async with engine.connect() as conn:
            timescale = await conn.scalar(
                text("SELECT extversion FROM pg_extension WHERE extname = 'timescaledb'")
            )
        await redis.ping()
    except Exception as exc:  # report which dependency is down instead of a bare 500
        raise HTTPException(503, f"dependency unavailable: {exc}") from exc
    return {"status": "ok", "timescaledb": timescale}
