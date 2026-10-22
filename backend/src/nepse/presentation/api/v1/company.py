import json
import os
from collections.abc import AsyncIterator

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import ValidationError

from nepse.application.fundamentals.get_company_full import DEFAULT_RISK_FREE_RATE, get_company_full
from nepse.application.fundamentals.ingest import ingest_dividends, ingest_financials
from nepse.application.fundamentals.ports import UpstreamError
from nepse.domain.calendar.npt import now_npt
from nepse.infrastructure.cache.redis_client import redis
from nepse.infrastructure.db.repositories.fundamentals import SqlFundamentalsRepository
from nepse.infrastructure.db.session import SessionLocal
from nepse.infrastructure.upstream.merolagani import MeroLaganiClient
from nepse.infrastructure.upstream.nepalipaisa import NepaliPaisaClient

router = APIRouter(prefix="/api/v1/company", tags=["company"])


async def _repo() -> AsyncIterator[SqlFundamentalsRepository]:
    async with SessionLocal() as session:
        yield SqlFundamentalsRepository(session)


class RedisQuotes:
    """Reads the live quote hash written by feat/ingestion (docs/CONTRACTS.md)."""
    async def quote(self, symbol: str) -> dict | None:
        try:
            raw = await redis.hget("nepse:live:quotes", symbol)
        except Exception:  # live data is optional; the page still renders from EOD
            return None
        return json.loads(raw) if raw else None


@router.get("/{symbol}/full")
async def company_full(symbol: str, risk_free_rate: float = DEFAULT_RISK_FREE_RATE,
                       repo: SqlFundamentalsRepository = Depends(_repo)) -> dict:
    data = await get_company_full(symbol, repo, now_npt().date(), RedisQuotes(), risk_free_rate=risk_free_rate)
    if data is None:
        raise HTTPException(404, f"unknown symbol {symbol.upper()}")
    return data


@router.post("/{symbol}/refresh")
async def refresh(symbol: str, sector_metrics: dict | None = Body(None, embed=True),
                  repo: SqlFundamentalsRepository = Depends(_repo)) -> dict:
    """Dev-only manual trigger; production runs the same use cases from feat/ingestion's scheduler."""
    if os.getenv("NEPSE_DEV_ENDPOINTS", "1") == "0":  # set to 0 in production
        raise HTTPException(404)
    nepalipaisa, merolagani = NepaliPaisaClient(), MeroLaganiClient()
    try:
        quarter = await ingest_financials(symbol, repo, [merolagani, nepalipaisa], nepalipaisa, sector_metrics)
        dividends = await ingest_dividends(symbol, repo, [nepalipaisa, merolagani])
    except UpstreamError as exc:
        raise HTTPException(502, str(exc)) from exc
    except (ValueError, ValidationError) as exc:
        raise HTTPException(422, str(exc)) from exc
    return {"quarter": quarter, "dividends": dividends}
