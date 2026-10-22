import hmac
import json
import os
from collections.abc import AsyncIterator

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Query
from pydantic import ValidationError

from nepse.application.fundamentals.get_company_full import (
    DEFAULT_DCF_GROWTH,
    DEFAULT_RISK_FREE_RATE,
    DEFAULT_TERMINAL_GROWTH,
    get_company_full,
)
from nepse.application.fundamentals.ingest import ingest_dividends, ingest_financials
from nepse.application.fundamentals.ports import UpstreamError
from nepse.domain.calendar.npt import now_npt
from nepse.application.market.get_depth import depth_dict, get_depth
from nepse.infrastructure.cache.redis_client import redis
from nepse.infrastructure.cache.redis_live_store import RedisLiveStore
from nepse.infrastructure.db.repositories.fundamentals import SqlFundamentalsRepository
from nepse.infrastructure.db.session import SessionLocal
from nepse.infrastructure.upstream.merolagani import MeroLaganiClient
from nepse.infrastructure.upstream.nepalipaisa import NepaliPaisaClient
from nepse.infrastructure.upstream.nepse.client import NepseClient, new_http_client
from nepse.infrastructure.upstream.nepse.wasm_token import TokenSolver

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


class LiveDepth:
    """Order book fetched on demand and cached in Redis for a few seconds; the page renders without it."""
    _client: NepseClient | None = None

    async def depth(self, symbol: str, nepse_id: int) -> dict | None:
        try:
            if LiveDepth._client is None:  # ponytail: one shared client per API process, never closed
                LiveDepth._client = NepseClient(new_http_client(), redis, TokenSolver())
            return depth_dict(await get_depth(symbol, nepse_id, LiveDepth._client, RedisLiveStore(redis)))
        except Exception:  # upstream down / token solver failure
            return None


@router.get("/{symbol}/full")
async def company_full(symbol: str, risk_free_rate: float = Query(DEFAULT_RISK_FREE_RATE, ge=0, le=0.5),
                       dcf_growth: float = Query(DEFAULT_DCF_GROWTH, ge=-0.5, le=1.0),
                       terminal_growth: float = Query(DEFAULT_TERMINAL_GROWTH, ge=0, le=0.1),
                       repo: SqlFundamentalsRepository = Depends(_repo)) -> dict:
    data = await get_company_full(symbol, repo, now_npt().date(), RedisQuotes(), risk_free_rate=risk_free_rate,
                                  dcf_growth=dcf_growth, terminal_growth=terminal_growth, depth=LiveDepth())
    if data is None:
        raise HTTPException(404, f"unknown symbol {symbol.upper()}")
    return data


def guard_dev(token: str | None) -> None:
    if os.getenv("NEPSE_DEV_ENDPOINTS") != "1":
        raise HTTPException(404)
    expected = os.getenv("NEPSE_ADMIN_TOKEN")
    if expected and not hmac.compare_digest(token or "", expected):
        raise HTTPException(403, "bad admin token")


@router.post("/{symbol}/refresh")
async def refresh(symbol: str, sector_metrics: dict | None = Body(None, embed=True),
                  x_admin_token: str | None = Header(None),
                  repo: SqlFundamentalsRepository = Depends(_repo)) -> dict:
    """Manual trigger; production runs the same use cases from the scheduler. Off unless NEPSE_DEV_ENDPOINTS=1,
    and when NEPSE_ADMIN_TOKEN is set the X-Admin-Token header must match it."""
    guard_dev(x_admin_token)
    nepalipaisa, merolagani = NepaliPaisaClient(), MeroLaganiClient()
    try:
        quarter = await ingest_financials(symbol, repo, [merolagani, nepalipaisa], nepalipaisa, sector_metrics)
        dividends = await ingest_dividends(symbol, repo, [nepalipaisa, merolagani])
    except UpstreamError as exc:
        raise HTTPException(502, str(exc)) from exc
    except (ValueError, ValidationError) as exc:
        raise HTTPException(422, str(exc)) from exc
    return {"quarter": quarter, "dividends": dividends}
