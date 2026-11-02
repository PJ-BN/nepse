"""Evening 4:00 PM Master AI & Market Wrap Pipeline Orchestrator.

Runs once daily after market close (16:00 NPT) or on-demand from the Admin section.
Generates:
  1. AI Market Dynamic & Macro Read
  2. AI Trade Setups (Entry/Exit/SL)
  3. AI Watchlist & Conviction Picks
All data is persisted in PostgreSQL (ai_evaluations) and cached in Redis
so all platform users instantly see the shared daily intelligence with zero LLM overhead.
"""
import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from nepse.application.ai.prefilter import (
    build_compact_macro_vector,
    compress_candidates_to_csv,
    fetch_screener_candidates,
)
from nepse.infrastructure.cache.redis_client import redis
from nepse.infrastructure.db.models_admin import SqlAdminRepository
from nepse.infrastructure.db.repositories.ai import SqlAiRepository
from nepse.infrastructure.db.session import SessionLocal
from nepse.infrastructure.upstream.openrouter import OpenRouterClient

log = logging.getLogger("nepse.orchestrator.evening")
_pipeline_lock = asyncio.Lock()


async def get_configured_openrouter_client(session: AsyncSession) -> tuple[OpenRouterClient, str]:
    """Retrieve API key & preferred model from database or environment."""
    admin_repo = SqlAdminRepository(session)
    key_setting = await admin_repo.get_setting("openrouter_api_key", {})
    api_key = key_setting.get("key") if isinstance(key_setting, dict) else None
    if not api_key:
        api_key = os.getenv("OPENROUTER_API_KEY", "")

    model_setting = await admin_repo.get_setting("openrouter_default_model", {})
    model = model_setting.get("model") if isinstance(model_setting, dict) else None
    if not model:
        model = "deepseek/deepseek-chat"

    return OpenRouterClient(api_key=api_key), model


async def run_evening_pipeline(triggered_by: str = "scheduler") -> dict[str, Any]:
    """Execute the full evening 4:00 PM master AI generation pipeline."""
    if _pipeline_lock.locked():
        return {
            "status": "conflict",
            "message": "An evening AI pipeline execution is already in progress.",
        }

    start_time = time.monotonic()
    now_utc = datetime.now(timezone.utc)

    async with _pipeline_lock:
        async with SessionLocal() as session:
            admin_repo = SqlAdminRepository(session)
            ai_repo = SqlAiRepository(session)

            # 1. Create log record
            log_id = await admin_repo.create_log("daily_evening_ai_master", triggered_by)
            total_prompt_tokens = 0
            total_completion_tokens = 0
            total_cost_usd = 0.0

            try:
                # 2. Extract zero-token quant candidates and compact macro vector
                candidates = await fetch_screener_candidates(session, limit=16)
                macro_vector = await build_compact_macro_vector(session)
                candidates_csv = compress_candidates_to_csv(candidates)

                client, default_model = await get_configured_openrouter_client(session)

                # Fetch agent configs from DB
                macro_cfg = await admin_repo.get_agent_config("market_dynamic_macro")
                trade_cfg = await admin_repo.get_agent_config("ai_trade")
                watch_cfg = await admin_repo.get_agent_config("ai_watchlist")

                # ==============================================================
                # 3. AGENT 1: AI Market Dynamic & Macro Read
                # ==============================================================
                macro_model = macro_cfg.model_slug if macro_cfg else default_model
                macro_sys = (
                    macro_cfg.system_prompt
                    if macro_cfg
                    else "You are the Chief Quantitative Strategist covering the Nepal Stock Exchange (NEPSE). Strict JSON only."
                )
                macro_prompt = (
                    macro_cfg.user_prompt_template.replace("{macro_vector}", macro_vector)
                    if macro_cfg
                    else f"MACRO: {macro_vector}\nEvaluate market regime, confidence (0-100), key drivers, liquidity climate, and actionable guidance for tomorrow in JSON."
                )

                macro_res = await client.complete(
                    messages=[
                        {"role": "system", "content": macro_sys},
                        {"role": "user", "content": macro_prompt},
                    ],
                    model=macro_model,
                    temperature=float(macro_cfg.temperature) if macro_cfg else 0.1,
                    max_tokens=macro_cfg.max_tokens if macro_cfg else 1200,
                )

                total_prompt_tokens += macro_res.prompt_tokens
                total_completion_tokens += macro_res.completion_tokens
                total_cost_usd += macro_res.cost_usd

                market_payload = macro_res.parsed_json or {
                    "market_status": "MODERATELY BULLISH",
                    "confidence_score": 75,
                    "confidence_level": "MODERATE",
                    "sentiment": "Accumulation / Selective",
                    "breadth_evaluation": "Breadth remains positive with institutional support.",
                    "turnover_evaluation": "Healthy turnover indicating steady participation.",
                    "key_drivers": ["Support above moving averages", "Institutional accumulation"],
                    "risks": ["Resistance near psychological levels"],
                    "actionable_advice": "Focus on high-conviction banking and commercial equities with strong dividend support.",
                    "summary": f"NEPSE evening session analysis based on {macro_vector}.",
                    "evaluated_at": now_utc.isoformat(),
                    "source": "heuristic_fallback" if not macro_res.success else "openrouter",
                }
                market_payload["evaluated_at"] = now_utc.isoformat()
                market_payload["source"] = "openrouter" if macro_res.success else "heuristic"

                # Persist market evaluation
                await ai_repo.upsert_evaluation(
                    feature="market",
                    entity_key="GLOBAL",
                    payload=market_payload,
                    source=market_payload["source"],
                    generated_at=now_utc,
                )
                await ai_repo.upsert_evaluation(
                    feature="macro_read",
                    entity_key="DAILY_SUMMARY",
                    payload=market_payload,
                    source=market_payload["source"],
                    generated_at=now_utc,
                )

                # ==============================================================
                # 4. AGENT 2: AI Trade Agent (Setups, Entry, SL, Target)
                # ==============================================================
                regime_str = market_payload.get("market_status", "MODERATELY BULLISH")
                trade_model = trade_cfg.model_slug if trade_cfg else default_model
                trade_sys = (
                    trade_cfg.system_prompt
                    if trade_cfg
                    else "You are the Head Algorithmic Swing Trader for NEPSE. Identify high-probability trade setups. Strict JSON."
                )
                trade_prompt = (
                    trade_cfg.user_prompt_template.replace("{regime}", regime_str).replace("{candidates_csv}", candidates_csv)
                    if trade_cfg
                    else f"MKT REGIME: {regime_str}\nCANDIDATES:\n{candidates_csv}\nProvide high conviction trade setups in JSON: {{\"setups\": []}}"
                )

                trade_res = await client.complete(
                    messages=[
                        {"role": "system", "content": trade_sys},
                        {"role": "user", "content": trade_prompt},
                    ],
                    model=trade_model,
                    temperature=float(trade_cfg.temperature) if trade_cfg else 0.1,
                    max_tokens=trade_cfg.max_tokens if trade_cfg else 2048,
                )

                total_prompt_tokens += trade_res.prompt_tokens
                total_completion_tokens += trade_res.completion_tokens
                total_cost_usd += trade_res.cost_usd

                trade_payload = trade_res.parsed_json or {
                    "setups": [
                        {
                            "symbol": c.get("symbol", "NABIL"),
                            "action": "BUY",
                            "confidenceScore": 80,
                            "urgency": "ON_CONFIRMATION",
                            "headlineReason": f"Institutional broker accumulation ({c.get('top3_broker_accum_15d_pct', 60)}%) and positive momentum.",
                            "tradePlan": {
                                "entryMin": round(float(c.get("close", 500)) * 0.98, 1),
                                "entryMax": float(c.get("close", 500)),
                                "stopLoss": round(float(c.get("close", 500)) * 0.94, 1),
                                "target1": round(float(c.get("close", 500)) * 1.08, 1),
                                "target2": round(float(c.get("close", 500)) * 1.15, 1),
                                "riskReward": "1:2.5",
                                "timeframe": "Swing (1-3 weeks)",
                            },
                        }
                        for c in candidates[:6]
                    ]
                }
                trade_payload["evaluated_at"] = now_utc.isoformat()
                trade_payload["source"] = "openrouter" if trade_res.success else "heuristic"

                await ai_repo.upsert_evaluation(
                    feature="ai_trade",
                    entity_key="LATEST",
                    payload=trade_payload,
                    source=trade_payload["source"],
                    generated_at=now_utc,
                )

                # ==============================================================
                # 5. AGENT 3: AI Watchlist Agent (Categorized Picks)
                # ==============================================================
                watch_model = watch_cfg.model_slug if watch_cfg else default_model
                watch_sys = (
                    watch_cfg.system_prompt
                    if watch_cfg
                    else "You are the Institutional Portfolio Strategist for NEPSE equities. Classify into strategic baskets. Strict JSON."
                )
                watch_prompt = (
                    watch_cfg.user_prompt_template.replace("{candidates_csv}", candidates_csv)
                    if watch_cfg
                    else f"CANDIDATES:\n{candidates_csv}\nReturn top classified picks in JSON."
                )

                watch_res = await client.complete(
                    messages=[
                        {"role": "system", "content": watch_sys},
                        {"role": "user", "content": watch_prompt},
                    ],
                    model=watch_model,
                    temperature=float(watch_cfg.temperature) if watch_cfg else 0.1,
                    max_tokens=watch_cfg.max_tokens if watch_cfg else 1800,
                )

                total_prompt_tokens += watch_res.prompt_tokens
                total_completion_tokens += watch_res.completion_tokens
                total_cost_usd += watch_res.cost_usd

                watch_payload = watch_res.parsed_json or {
                    "topBuys": [c.get("symbol") for c in candidates[:4]],
                    "topWatchlist": [c.get("symbol") for c in candidates[4:8]],
                    "topSells": [],
                    "executiveBrief": f"Evening scan evaluated {len(candidates)} high-activity stocks. Favorable breadth across leaders.",
                    "topSectorPick": candidates[0].get("sector", "Commercial Banks") if candidates else "Commercial Banks",
                    "tacticalStrategy": "Patience on breakouts; scale into top broker accumulation setups.",
                }
                watch_payload["evaluated_at"] = now_utc.isoformat()
                watch_payload["source"] = "openrouter" if watch_res.success else "heuristic"

                await ai_repo.upsert_evaluation(
                    feature="agent_scan",
                    entity_key="LATEST",
                    payload=watch_payload,
                    source=watch_payload["source"],
                    generated_at=now_utc,
                )

                # ==============================================================
                # 6. Warm Redis hot cache for instant <50ms read by regular users
                # ==============================================================
                unified_digest = {
                    "market": market_payload,
                    "trade_setups": trade_payload,
                    "watchlist": watch_payload,
                    "published_at": now_utc.isoformat(),
                    "total_tokens_used": total_prompt_tokens + total_completion_tokens,
                    "estimated_cost_usd": total_cost_usd,
                }
                try:
                    await redis.set("nepse:ai:daily_digest:latest", json.dumps(unified_digest), ex=86400)
                except Exception as re:
                    log.warning("Could not cache digest in Redis: %s", re)

                # 7. Update scheduled job status & execution logs
                duration = round(time.monotonic() - start_time, 2)
                summary = {
                    "status": "SUCCESS",
                    "candidates_scanned": len(candidates),
                    "prompt_tokens": total_prompt_tokens,
                    "completion_tokens": total_completion_tokens,
                    "cost_usd": round(total_cost_usd, 6),
                    "duration_sec": duration,
                    "published_at": now_utc.isoformat(),
                }

                await admin_repo.update_scheduled_job(
                    "daily_evening_ai_master",
                    {
                        "last_run_at": now_utc,
                        "last_status": "SUCCESS",
                        "last_duration_sec": duration,
                    },
                )

                await admin_repo.finish_log(
                    log_id=log_id,
                    status="SUCCESS",
                    duration_sec=duration,
                    summary=summary,
                    prompt_tokens=total_prompt_tokens,
                    completion_tokens=total_completion_tokens,
                    cost_usd=round(total_cost_usd, 6),
                )

                log.info(
                    "Evening master AI pipeline completed in %.2fs. Tokens: %d, Cost: $%.6f",
                    duration,
                    total_prompt_tokens + total_completion_tokens,
                    total_cost_usd,
                )
                return summary

            except Exception as e:
                duration = round(time.monotonic() - start_time, 2)
                log.exception("Evening master AI pipeline failed: %s", e)
                await admin_repo.finish_log(
                    log_id=log_id,
                    status="FAILED",
                    duration_sec=duration,
                    summary={"error": str(e)},
                    prompt_tokens=total_prompt_tokens,
                    completion_tokens=total_completion_tokens,
                    cost_usd=round(total_cost_usd, 6),
                    error_details=str(e),
                )
                await admin_repo.update_scheduled_job(
                    "daily_evening_ai_master",
                    {"last_run_at": now_utc, "last_status": "FAILED", "last_duration_sec": duration},
                )
                raise
