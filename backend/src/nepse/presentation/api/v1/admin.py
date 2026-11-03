"""Admin section API endpoints for full platform control.

Manages:
  1. Users & RBAC
  2. Data Sources & Upstream Health Probes
  3. Dynamic Scheduling & Manual Sync Execution
  4. AI Agents, Prompts & OpenRouter API / Token Budget
"""
import logging
import time
from datetime import datetime, timezone
from typing import Any
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from nepse.application.auth.ports import User
from nepse.application.ingestion.eod import run_eod
from nepse.application.macro.use_cases import ingest_sebon
from nepse.application.news.use_cases import ingest_news
from nepse.application.orchestrator.evening_pipeline import run_evening_pipeline
from nepse.domain.calendar.npt import now_npt
from nepse.infrastructure.cache.redis_client import redis
from nepse.infrastructure.db.models_admin import SqlAdminRepository
from nepse.infrastructure.db.models_portfolio import SqlUserRepo
from nepse.infrastructure.db.repositories.ingestion import SqlIngestionRepository
from nepse.infrastructure.db.repositories.macro import SqlMacroRepository
from nepse.infrastructure.db.repositories.news import SqlNewsRepository
from nepse.infrastructure.db.repositories.screener import SqlScreenerRepository
from nepse.infrastructure.db.session import SessionLocal, engine
from nepse.infrastructure.upstream.nepse.client import NepseClient, new_http_client
from nepse.infrastructure.upstream.nepse.wasm_token import TokenSolver
from nepse.infrastructure.upstream.news_sources import MultiSourceNewsAggregator
from nepse.infrastructure.upstream.openrouter import OpenRouterClient
from nepse.infrastructure.upstream.sebon import SebonClient
from nepse.presentation.api.v1.auth import get_session, require_admin

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


# ==============================================================================
# SCHEMAS
# ==============================================================================
class UserRoleUpdate(BaseModel):
    role: str = Field(..., pattern="^(admin|user)$")


class UserStatusUpdate(BaseModel):
    is_active: bool


class DataSourceUpdate(BaseModel):
    is_enabled: bool | None = None
    priority: int | None = None
    rate_limit_delay_ms: int | None = None
    timeout_sec: int | None = None
    config: dict[str, Any] | None = None


class ScheduleUpdate(BaseModel):
    schedule_time_npt: str | None = Field(None, pattern=r"^\d{2}:\d{2}$")
    days_of_week: str | None = None
    is_enabled: bool | None = None


class OpenRouterConfigUpdate(BaseModel):
    api_key: str | None = None
    default_model: str | None = None
    monthly_budget_usd: float | None = None


class AgentConfigUpdate(BaseModel):
    model_slug: str | None = None
    is_enabled: bool | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    system_prompt: str | None = None
    user_prompt_template: str | None = None


# ==============================================================================
# 1. OVERVIEW & TELEMETRY
# ==============================================================================
@router.get("/overview")
async def get_admin_overview(
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """Overview dashboard metrics, system health, and token costs."""
    admin_repo = SqlAdminRepository(session)
    user_repo = SqlUserRepo(session)

    # 1. User stats
    _, total_users = await user_repo.list_users(limit=1)

    # 2. Data source counts
    sources = await admin_repo.list_data_sources()
    healthy_sources = sum(1 for s in sources if s.health_status == "HEALTHY" and s.is_enabled)

    # 3. Scheduled master job info
    master_job = await admin_repo.get_scheduled_job("daily_evening_ai_master")

    # 4. Token & cost metrics
    token_stats = await admin_repo.get_token_usage_stats()

    # 5. Database counts
    db_metrics_res = await session.execute(
        text("""
        SELECT 
            (SELECT COUNT(*) FROM companies WHERE status = 'ACTIVE') AS active_companies,
            (SELECT COUNT(*) FROM ohlcv_daily) AS daily_bars_count,
            (SELECT COUNT(*) FROM news_articles) AS total_news,
            (SELECT MAX(trade_date) FROM ohlcv_daily) AS latest_trade_date
    """)
    )
    db_metrics = db_metrics_res.mappings().first() or {}

    return {
        "current_time_npt": now_npt().isoformat(),
        "total_users": total_users,
        "data_sources": {
            "total": len(sources),
            "healthy": healthy_sources,
            "active": sum(1 for s in sources if s.is_enabled),
        },
        "daily_evening_job": {
            "schedule_time_npt": master_job.schedule_time_npt if master_job else "16:00",
            "is_enabled": master_job.is_enabled if master_job else True,
            "last_status": master_job.last_status if master_job else "IDLE",
            "last_run_at": master_job.last_run_at.isoformat() if master_job and master_job.last_run_at else None,
            "last_duration_sec": float(master_job.last_duration_sec) if master_job else 0,
        },
        "token_usage": token_stats,
        "database": {
            "active_companies": db_metrics.get("active_companies", 0),
            "daily_bars_count": db_metrics.get("daily_bars_count", 0),
            "total_news": db_metrics.get("total_news", 0),
            "latest_trade_date": str(db_metrics.get("latest_trade_date", "")),
        },
    }


# ==============================================================================
# 2. USER MANAGEMENT
# ==============================================================================
@router.get("/users")
async def list_users(
    search: str | None = Query(None),
    role: str | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """List registered users with search, role filter, and pagination."""
    users, total = await SqlUserRepo(session).list_users(search=search, role=role, limit=limit, offset=offset)
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "role": u.role,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
            }
            for u in users
        ],
    }


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    body: UserRoleUpdate,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """Promote or demote a user role."""
    if admin.id == user_id and body.role != "admin":
        raise HTTPException(400, "You cannot remove your own admin privileges.")
    success = await SqlUserRepo(session).update_role(user_id, body.role)
    if not success:
        raise HTTPException(404, "User not found.")
    return {"status": "success", "user_id": user_id, "new_role": body.role}


@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    body: UserStatusUpdate,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """Activate or suspend a user account."""
    if admin.id == user_id and not body.is_active:
        raise HTTPException(400, "You cannot deactivate your own account.")
    success = await SqlUserRepo(session).update_status(user_id, body.is_active)
    if not success:
        raise HTTPException(404, "User not found.")
    return {"status": "success", "user_id": user_id, "is_active": body.is_active}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """Delete a user account."""
    if admin.id == user_id:
        raise HTTPException(400, "You cannot delete your own account.")
    success = await SqlUserRepo(session).delete(user_id)
    if not success:
        raise HTTPException(404, "User not found.")
    return {"status": "success", "user_id": user_id, "deleted": True}


# ==============================================================================
# 3. DATA SOURCES & UPSTREAM HEALTH
# ==============================================================================
@router.get("/data-sources")
async def list_data_sources(
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    """List all upstream data sources, priority, and health state."""
    sources = await SqlAdminRepository(session).list_data_sources()
    return [
        {
            "id": s.id,
            "name": s.name,
            "category": s.category,
            "priority": s.priority,
            "is_enabled": s.is_enabled,
            "rate_limit_delay_ms": s.rate_limit_delay_ms,
            "timeout_sec": s.timeout_sec,
            "health_status": s.health_status,
            "last_success_at": s.last_success_at.isoformat() if s.last_success_at else None,
            "last_error_at": s.last_error_at.isoformat() if s.last_error_at else None,
            "last_error_msg": s.last_error_msg,
            "config": s.config,
        }
        for s in sources
    ]


@router.patch("/data-sources/{source_id}")
async def update_data_source(
    source_id: str,
    body: DataSourceUpdate,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """Toggle a data source on/off, change priority or rate limit."""
    updates = body.model_dump(exclude_unset=True)
    row = await SqlAdminRepository(session).update_data_source(source_id, updates)
    if not row:
        raise HTTPException(404, f"Data source {source_id} not found.")
    return {"status": "success", "source_id": source_id, "updated": True}


@router.post("/data-sources/{source_id}/test")
async def test_data_source_health(
    source_id: str,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """Perform a live HTTP ping/probe against the upstream provider."""
    test_urls = {
        "nepse_official": "https://nepalstock.com.np",
        "sharesansar": "https://www.sharesansar.com",
        "merolagani": "https://merolagani.com",
        "nepalipaisa": "https://nepalipaisa.com",
        "sebon": "https://sebon.gov.np",
        "nrb": "https://nrb.org.np",
        "news_sources": "https://bizshala.com",
    }
    url = test_urls.get(source_id)
    if not url:
        raise HTTPException(400, f"No probe URL defined for {source_id}")

    t0 = time.monotonic()
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=headers)
            latency_ms = round((time.monotonic() - t0) * 1000)
            is_ok = resp.status_code < 400
            await SqlAdminRepository(session).record_data_source_result(source_id, is_ok, None if is_ok else f"HTTP {resp.status_code}")
            return {
                "source_id": source_id,
                "status": "HEALTHY" if is_ok else "DEGRADED",
                "http_status": resp.status_code,
                "latency_ms": latency_ms,
            }
    except Exception as e:
        latency_ms = round((time.monotonic() - t0) * 1000)
        await SqlAdminRepository(session).record_data_source_result(source_id, False, str(e))
        return {
            "source_id": source_id,
            "status": "DOWN",
            "error": str(e),
            "latency_ms": latency_ms,
        }


# ==============================================================================
# 4. AI MANAGEMENT & OPENROUTER CONFIG
# ==============================================================================
@router.get("/ai/config")
async def get_ai_config(
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """Retrieve OpenRouter settings, token stats, and agent prompt configurations."""
    admin_repo = SqlAdminRepository(session)
    key_setting = await admin_repo.get_setting("openrouter_api_key", {})
    raw_key = key_setting.get("key", "") if isinstance(key_setting, dict) else ""
    masked_key = f"{raw_key[:10]}••••••••{raw_key[-4:]}" if len(raw_key) > 14 else ("Configured" if raw_key else "Not Set")

    model_setting = await admin_repo.get_setting("openrouter_default_model", {})
    default_model = model_setting.get("model", "deepseek/deepseek-chat") if isinstance(model_setting, dict) else "deepseek/deepseek-chat"

    budget_setting = await admin_repo.get_setting("ai_token_budget_monthly", {})
    budget_limit = budget_setting.get("limit_usd", 10.0) if isinstance(budget_setting, dict) else 10.0

    agents = await admin_repo.list_agent_configs()
    token_stats = await admin_repo.get_token_usage_stats()

    return {
        "openrouter": {
            "is_configured": bool(raw_key),
            "masked_key": masked_key,
            "default_model": default_model,
            "monthly_budget_usd": budget_limit,
        },
        "token_usage": token_stats,
        "agents": [
            {
                "agent_id": a.agent_id,
                "name": a.name,
                "model_provider": a.model_provider,
                "model_slug": a.model_slug,
                "is_enabled": a.is_enabled,
                "temperature": float(a.temperature),
                "max_tokens": a.max_tokens,
                "system_prompt": a.system_prompt,
                "user_prompt_template": a.user_prompt_template,
            }
            for a in agents
        ],
    }


@router.post("/ai/config")
async def update_openrouter_config(
    body: OpenRouterConfigUpdate,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """Update OpenRouter API key, model selection, or monthly spend cap."""
    admin_repo = SqlAdminRepository(session)
    if body.api_key is not None:
        await admin_repo.set_setting("openrouter_api_key", {"key": body.api_key.strip()}, "OpenRouter API Key")
    if body.default_model is not None:
        await admin_repo.set_setting("openrouter_default_model", {"model": body.default_model.strip()}, "Default Model")
    if body.monthly_budget_usd is not None:
        await admin_repo.set_setting("ai_token_budget_monthly", {"limit_usd": body.monthly_budget_usd}, "Monthly Budget")
    return {"status": "success", "updated": True}


@router.patch("/ai/agents/{agent_id}")
async def update_ai_agent(
    agent_id: str,
    body: AgentConfigUpdate,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """Update agent prompt templates, temperature, max tokens, or model."""
    updates = body.model_dump(exclude_unset=True)
    row = await SqlAdminRepository(session).update_agent_config(agent_id, updates)
    if not row:
        raise HTTPException(404, f"Agent {agent_id} not found.")
    return {"status": "success", "agent_id": agent_id, "updated": True}


# ==============================================================================
# 5. DYNAMIC SCHEDULES & MANUAL SYNC ROOM
# ==============================================================================
@router.get("/schedules")
async def list_schedules(
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    """List all scheduled jobs with their NPT run times and statuses."""
    jobs = await SqlAdminRepository(session).list_scheduled_jobs()
    return [
        {
            "id": j.id,
            "name": j.name,
            "description": j.description,
            "cron_expr": j.cron_expr,
            "schedule_time_npt": j.schedule_time_npt,
            "days_of_week": j.days_of_week,
            "is_enabled": j.is_enabled,
            "last_run_at": j.last_run_at.isoformat() if j.last_run_at else None,
            "next_run_at": j.next_run_at.isoformat() if j.next_run_at else None,
            "last_status": j.last_status,
            "last_duration_sec": float(j.last_duration_sec or 0),
        }
        for j in jobs
    ]


@router.patch("/schedules/{job_id}")
async def update_schedule(
    job_id: str,
    body: ScheduleUpdate,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """Edit the scheduled time (e.g. 16:00 NPT) or toggle job enabled state."""
    updates = body.model_dump(exclude_unset=True)
    row = await SqlAdminRepository(session).update_scheduled_job(job_id, updates)
    if not row:
        raise HTTPException(404, f"Job {job_id} not found.")
    return {"status": "success", "job_id": job_id, "updated": True}


@router.post("/schedules/{job_id}/run")
async def run_scheduled_job_manually(
    job_id: str,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """Trigger a manual on-demand execution of any job right now."""
    admin_repo = SqlAdminRepository(session)
    job_row = await admin_repo.get_scheduled_job(job_id)
    if not job_row:
        raise HTTPException(404, f"Job '{job_id}' not found in scheduled_jobs.")

    # 1. Daily 4:00 PM Master AI & Market Wrap Pipeline
    if job_id == "daily_evening_ai_master":
        try:
            result = await run_evening_pipeline(triggered_by=f"admin:{admin.email}")
            is_success = result.get("status") == "SUCCESS"
            return {
                "status": "success" if is_success else "error",
                "job_id": job_id,
                "result": result,
            }
        except Exception as e:
            log.exception("Manual evening AI pipeline run failed: %s", e)
            return {
                "status": "error",
                "job_id": job_id,
                "result": {"status": "FAILED", "error": str(e)},
            }

    # 2. NEPSE EOD Market Data Ingestion
    if job_id == "eod_market_sync":
        start_time = time.perf_counter()
        log_id = await admin_repo.create_log(job_id, f"admin:{admin.email}")
        try:
            async with new_http_client() as http:
                source = NepseClient(http, redis, TokenSolver())
                repo = SqlIngestionRepository(engine)
                report = await run_eod(source, repo)

            async with SessionLocal() as s_session:
                await SqlScreenerRepository(s_session).refresh()

            duration_sec = round(time.perf_counter() - start_time, 2)
            now_utc = datetime.now(timezone.utc)
            summary = {
                "business_date": report.business_date,
                "companies": report.companies,
                "daily_bars": report.daily_bars,
                "index_bars": report.index_bars,
                "floorsheet_ticks": report.floorsheet_ticks,
            }
            await admin_repo.finish_log(
                log_id=log_id,
                status="SUCCESS",
                duration_sec=duration_sec,
                summary=summary,
            )
            await admin_repo.update_scheduled_job(
                job_id,
                {
                    "last_run_at": now_utc,
                    "last_status": "SUCCESS",
                    "last_duration_sec": duration_sec,
                },
            )
            return {
                "status": "success",
                "job_id": job_id,
                "result": {
                    "status": "SUCCESS",
                    "duration_sec": duration_sec,
                    **summary,
                },
            }
        except Exception as e:
            duration_sec = round(time.perf_counter() - start_time, 2)
            now_utc = datetime.now(timezone.utc)
            log.exception("Manual eod_market_sync failed: %s", e)
            await admin_repo.finish_log(
                log_id=log_id,
                status="FAILED",
                duration_sec=duration_sec,
                summary={},
                error_details=str(e),
            )
            await admin_repo.update_scheduled_job(
                job_id,
                {
                    "last_run_at": now_utc,
                    "last_status": "FAILED",
                    "last_duration_sec": duration_sec,
                },
            )
            return {
                "status": "error",
                "job_id": job_id,
                "result": {"status": "FAILED", "duration_sec": duration_sec, "error": str(e)},
            }

    # 3. Financial News & Macro Pulse Sync
    if job_id == "news_macro_sync":
        start_time = time.perf_counter()
        log_id = await admin_repo.create_log(job_id, f"admin:{admin.email}")
        try:
            async with SessionLocal() as s_session:
                repo = SqlNewsRepository(s_session)
                count = await ingest_news(MultiSourceNewsAggregator(), repo)

            duration_sec = round(time.perf_counter() - start_time, 2)
            now_utc = datetime.now(timezone.utc)
            summary = {"articles_ingested": count}
            await admin_repo.finish_log(
                log_id=log_id,
                status="SUCCESS",
                duration_sec=duration_sec,
                summary=summary,
            )
            await admin_repo.update_scheduled_job(
                job_id,
                {
                    "last_run_at": now_utc,
                    "last_status": "SUCCESS",
                    "last_duration_sec": duration_sec,
                },
            )
            return {
                "status": "success",
                "job_id": job_id,
                "result": {
                    "status": "SUCCESS",
                    "duration_sec": duration_sec,
                    "articles_ingested": count,
                },
            }
        except Exception as e:
            duration_sec = round(time.perf_counter() - start_time, 2)
            now_utc = datetime.now(timezone.utc)
            log.exception("Manual news_macro_sync failed: %s", e)
            await admin_repo.finish_log(
                log_id=log_id,
                status="FAILED",
                duration_sec=duration_sec,
                summary={},
                error_details=str(e),
            )
            await admin_repo.update_scheduled_job(
                job_id,
                {
                    "last_run_at": now_utc,
                    "last_status": "FAILED",
                    "last_duration_sec": duration_sec,
                },
            )
            return {
                "status": "error",
                "job_id": job_id,
                "result": {"status": "FAILED", "duration_sec": duration_sec, "error": str(e)},
            }

    # 4. SEBON Regulatory Filings Sync
    if job_id == "sebon_pipeline_sync":
        start_time = time.perf_counter()
        log_id = await admin_repo.create_log(job_id, f"admin:{admin.email}")
        try:
            async with SessionLocal() as s_session:
                repo = SqlMacroRepository(s_session)
                count = await ingest_sebon(SebonClient(), repo)

            duration_sec = round(time.perf_counter() - start_time, 2)
            now_utc = datetime.now(timezone.utc)
            summary = {"records_ingested": count}
            await admin_repo.finish_log(
                log_id=log_id,
                status="SUCCESS",
                duration_sec=duration_sec,
                summary=summary,
            )
            await admin_repo.update_scheduled_job(
                job_id,
                {
                    "last_run_at": now_utc,
                    "last_status": "SUCCESS",
                    "last_duration_sec": duration_sec,
                },
            )
            return {
                "status": "success",
                "job_id": job_id,
                "result": {
                    "status": "SUCCESS",
                    "duration_sec": duration_sec,
                    "records_ingested": count,
                },
            }
        except Exception as e:
            duration_sec = round(time.perf_counter() - start_time, 2)
            now_utc = datetime.now(timezone.utc)
            log.exception("Manual sebon_pipeline_sync failed: %s", e)
            await admin_repo.finish_log(
                log_id=log_id,
                status="FAILED",
                duration_sec=duration_sec,
                summary={},
                error_details=str(e),
            )
            await admin_repo.update_scheduled_job(
                job_id,
                {
                    "last_run_at": now_utc,
                    "last_status": "FAILED",
                    "last_duration_sec": duration_sec,
                },
            )
            return {
                "status": "error",
                "job_id": job_id,
                "result": {"status": "FAILED", "duration_sec": duration_sec, "error": str(e)},
            }

    raise HTTPException(400, f"Manual trigger for job '{job_id}' is not supported.")


@router.get("/schedules/logs")
async def list_schedule_logs(
    limit: int = Query(30, ge=1, le=100),
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    """List execution history and token usage logs."""
    logs = await SqlAdminRepository(session).list_logs(limit=limit)
    return [
        {
            "id": l.id,
            "job_id": l.job_id,
            "triggered_by": l.triggered_by,
            "status": l.status,
            "started_at": l.started_at.isoformat() if l.started_at else None,
            "finished_at": l.finished_at.isoformat() if l.finished_at else None,
            "duration_sec": float(l.duration_sec or 0),
            "prompt_tokens": l.prompt_tokens,
            "completion_tokens": l.completion_tokens,
            "cost_usd": float(l.cost_usd or 0),
            "summary": l.summary,
            "error_details": l.error_details,
        }
        for l in logs
    ]
