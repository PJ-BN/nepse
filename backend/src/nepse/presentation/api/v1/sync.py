"""FastAPI router for manual and automated on-demand data synchronization.

Provides endpoints to trigger EOD price ingestion, news & circular scraping,
SEBON IPO/right filings, and ShareSansar crosscheck directly from the UI or CLI.
"""
import asyncio
import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from nepse.application.ingestion.crosscheck import crosscheck_eod
from nepse.application.ingestion.eod import run_eod
from nepse.application.macro.use_cases import ingest_sebon
from nepse.application.news.use_cases import ingest_news
from nepse.domain.calendar.npt import now_npt
from nepse.infrastructure.cache.redis_client import redis
from nepse.infrastructure.cache.redis_live_store import RedisLiveStore
from nepse.infrastructure.db.repositories.ingestion import SqlIngestionRepository
from nepse.infrastructure.db.repositories.macro import SqlMacroRepository
from nepse.infrastructure.db.repositories.news import SqlNewsRepository
from nepse.infrastructure.db.repositories.screener import SqlScreenerRepository
from nepse.infrastructure.db.session import SessionLocal, engine
from nepse.infrastructure.upstream import sharesansar
from nepse.infrastructure.upstream.nepse.client import NepseClient, new_http_client
from nepse.infrastructure.upstream.nepse.wasm_token import TokenSolver
from nepse.infrastructure.upstream.news_sources import MultiSourceNewsAggregator
from nepse.infrastructure.upstream.sebon import SebonClient

log = logging.getLogger("nepse.sync")
router = APIRouter(prefix="/api/v1/sync", tags=["sync"])

_sync_lock = asyncio.Lock()
_last_sync: dict[str, Any] = {
    "status": "idle",
    "last_run": None,
    "last_job": None,
    "details": None,
}


@router.get("/status")
async def get_sync_status() -> dict[str, Any]:
    """Return database ingestion status, latest trade date, record counts, and active sync state."""
    async with SessionLocal() as session:
        max_date_res = await session.execute(text("SELECT MAX(trade_date) FROM ohlcv_daily"))
        latest_date = max_date_res.scalar()

        bars_count = 0
        floorsheet_count = 0
        if latest_date:
            b_res = await session.execute(
                text("SELECT COUNT(*) FROM ohlcv_daily WHERE trade_date = :d"),
                {"d": latest_date},
            )
            bars_count = b_res.scalar() or 0

            f_res = await session.execute(
                text("SELECT COUNT(*) FROM floorsheet_ticks WHERE trade_time::date = :d"),
                {"d": latest_date},
            )
            floorsheet_count = f_res.scalar() or 0

        comp_res = await session.execute(text("SELECT COUNT(*) FROM companies WHERE status = 'ACTIVE'"))
        active_companies = comp_res.scalar() or 0

        news_res = await session.execute(text("SELECT COUNT(*) FROM news_articles"))
        total_news = news_res.scalar() or 0

    return {
        "is_syncing": _sync_lock.locked(),
        "latest_trade_date": latest_date.isoformat() if latest_date else None,
        "daily_bars_count": bars_count,
        "floorsheet_count": floorsheet_count,
        "active_companies": active_companies,
        "total_news_articles": total_news,
        "last_sync": _last_sync,
        "current_time_npt": now_npt().isoformat(),
    }


@router.post("/eod")
async def sync_eod() -> dict[str, Any]:
    """Manually ingest today's NEPSE closing prices, index bars, floorsheet, and refresh screener."""
    if _sync_lock.locked():
        raise HTTPException(status_code=409, detail="A data sync task is currently in progress. Please wait.")

    async with _sync_lock:
        _last_sync["status"] = "running"
        _last_sync["last_job"] = "eod"
        _last_sync["last_run"] = datetime.now().isoformat()
        try:
            async with new_http_client() as http:
                source = NepseClient(http, redis, TokenSolver())
                repo = SqlIngestionRepository(engine)
                report = await run_eod(source, repo)

            async with SessionLocal() as session:
                await SqlScreenerRepository(session).refresh()

            res = {
                "status": "success",
                "job": "eod",
                "business_date": report.business_date,
                "companies": report.companies,
                "daily_bars": report.daily_bars,
                "index_bars": report.index_bars,
                "floorsheet_ticks": report.floorsheet_ticks,
                "timestamp": datetime.now().isoformat(),
            }
            _last_sync["status"] = "success"
            _last_sync["details"] = res
            return res
        except Exception as e:
            log.exception("EOD sync failed: %s", e)
            _last_sync["status"] = "error"
            _last_sync["details"] = {"error": str(e)}
            raise HTTPException(status_code=500, detail=f"EOD ingestion failed: {e}")


@router.post("/news")
async def sync_news() -> dict[str, Any]:
    """Manually pull latest financial news, regulatory circulars, and compute AI market impacts."""
    if _sync_lock.locked():
        raise HTTPException(status_code=409, detail="A data sync task is currently in progress. Please wait.")

    async with _sync_lock:
        _last_sync["status"] = "running"
        _last_sync["last_job"] = "news"
        _last_sync["last_run"] = datetime.now().isoformat()
        try:
            async with SessionLocal() as session:
                repo = SqlNewsRepository(session)
                count = await ingest_news(MultiSourceNewsAggregator(), repo)

            res = {
                "status": "success",
                "job": "news",
                "articles_ingested": count,
                "timestamp": datetime.now().isoformat(),
            }
            _last_sync["status"] = "success"
            _last_sync["details"] = res
            return res
        except Exception as e:
            log.exception("News sync failed: %s", e)
            _last_sync["status"] = "error"
            _last_sync["details"] = {"error": str(e)}
            raise HTTPException(status_code=500, detail=f"News ingestion failed: {e}")


@router.post("/sebon")
async def sync_sebon() -> dict[str, Any]:
    """Manually parse SEBON pipeline for IPO and Right-Share applications/approvals."""
    if _sync_lock.locked():
        raise HTTPException(status_code=409, detail="A data sync task is currently in progress. Please wait.")

    async with _sync_lock:
        _last_sync["status"] = "running"
        _last_sync["last_job"] = "sebon"
        _last_sync["last_run"] = datetime.now().isoformat()
        try:
            async with SessionLocal() as session:
                repo = SqlMacroRepository(session)
                count = await ingest_sebon(SebonClient(), repo)

            res = {
                "status": "success",
                "job": "sebon",
                "records_ingested": count,
                "timestamp": datetime.now().isoformat(),
            }
            _last_sync["status"] = "success"
            _last_sync["details"] = res
            return res
        except Exception as e:
            log.exception("SEBON sync failed: %s", e)
            _last_sync["status"] = "error"
            _last_sync["details"] = {"error": str(e)}
            raise HTTPException(status_code=500, detail=f"SEBON ingestion failed: {e}")


@router.post("/crosscheck")
async def sync_crosscheck() -> dict[str, Any]:
    """Crosscheck today's NEPSE closing prices against ShareSansar."""
    if _sync_lock.locked():
        raise HTTPException(status_code=409, detail="A data sync task is currently in progress. Please wait.")

    async with _sync_lock:
        _last_sync["status"] = "running"
        _last_sync["last_job"] = "crosscheck"
        _last_sync["last_run"] = datetime.now().isoformat()
        try:
            async with sharesansar.new_http_client() as http:
                repo = SqlIngestionRepository(engine)
                client = sharesansar.ShareSansarClient(http)
                report = await crosscheck_eod(client, repo)

            res = {
                "status": "success",
                "job": "crosscheck",
                "business_date": str(report.day),
                "compared": report.compared,
                "mismatches": [str(m) for m in report.mismatches],
                "missing_in_store": list(report.missing_in_store),
                "timestamp": datetime.now().isoformat(),
            }
            _last_sync["status"] = "success"
            _last_sync["details"] = res
            return res
        except Exception as e:
            log.exception("Crosscheck failed: %s", e)
            _last_sync["status"] = "error"
            _last_sync["details"] = {"error": str(e)}
            raise HTTPException(status_code=500, detail=f"Crosscheck failed: {e}")


@router.post("/all")
async def sync_all() -> dict[str, Any]:
    """Run full evening sync pipeline: EOD + News + SEBON Pipeline + Crosscheck."""
    if _sync_lock.locked():
        raise HTTPException(status_code=409, detail="A data sync task is currently in progress. Please wait.")

    async with _sync_lock:
        _last_sync["status"] = "running"
        _last_sync["last_job"] = "all"
        _last_sync["last_run"] = datetime.now().isoformat()
        results: dict[str, Any] = {}
        try:
            # 1. EOD
            async with new_http_client() as http:
                source = NepseClient(http, redis, TokenSolver())
                repo = SqlIngestionRepository(engine)
                eod_rep = await run_eod(source, repo)
                results["eod"] = {
                    "business_date": eod_rep.business_date,
                    "daily_bars": eod_rep.daily_bars,
                    "floorsheet_ticks": eod_rep.floorsheet_ticks,
                }

            async with SessionLocal() as session:
                await SqlScreenerRepository(session).refresh()

            # 2. News
            async with SessionLocal() as session:
                news_repo = SqlNewsRepository(session)
                news_count = await ingest_news(MultiSourceNewsAggregator(), news_repo)
                results["news"] = {"articles_ingested": news_count}

            # 3. SEBON
            try:
                async with SessionLocal() as session:
                    macro_repo = SqlMacroRepository(session)
                    sebon_count = await ingest_sebon(SebonClient(), macro_repo)
                    results["sebon"] = {"records_ingested": sebon_count}
            except Exception as se:
                log.warning("SEBON ingest warning during sync_all: %s", se)
                results["sebon"] = {"error": str(se)}

            # 4. Crosscheck
            try:
                async with sharesansar.new_http_client() as http:
                    client = sharesansar.ShareSansarClient(http)
                    repo = SqlIngestionRepository(engine)
                    cc_rep = await crosscheck_eod(client, repo)
                    results["crosscheck"] = {"compared": cc_rep.compared, "mismatches": len(cc_rep.mismatches)}
            except Exception as ce:
                log.warning("Crosscheck warning during sync_all: %s", ce)
                results["crosscheck"] = {"error": str(ce)}

            final_res = {
                "status": "success",
                "job": "all",
                "summary": results,
                "timestamp": datetime.now().isoformat(),
            }
            _last_sync["status"] = "success"
            _last_sync["details"] = final_res
            return final_res
        except Exception as e:
            log.exception("Full sync failed: %s", e)
            _last_sync["status"] = "error"
            _last_sync["details"] = {"error": str(e), "partial": results}
            raise HTTPException(status_code=500, detail=f"Full sync failed: {e}")
