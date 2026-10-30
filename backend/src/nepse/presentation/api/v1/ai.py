import os
from datetime import datetime, timezone
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from nepse.infrastructure.db.repositories.ai import SqlAiRepository
from nepse.presentation.api.v1.screener import get_session

router = APIRouter(prefix="/api/v1/ai", tags=["ai"])

NEXTJS_HOST_URL = os.getenv("NEXTJS_INTERNAL_URL", "http://host.docker.internal:3000")


class AiEvaluationSaveRequest(BaseModel):
    feature: str = Field(..., description="Feature name e.g. company, market, chart, news, agent_scan")
    entity_key: str = Field(..., description="Identifier e.g. NABIL, GLOBAL, NABIL:1D, 123, LATEST")
    payload: dict = Field(..., description="Complete AI evaluation payload")
    source: str = Field("agy", description="Generator source: agy or heuristic")
    generated_at: str | None = Field(None, description="ISO timestamp when AI generated this data")


@router.get("/evaluation")
async def get_ai_evaluation(
    feature: str = Query(..., description="Feature name e.g. company, market, chart, news, agent_scan"),
    entity_key: str = Query(..., description="Entity identifier e.g. NABIL, GLOBAL, NABIL:1D, 123, LATEST"),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Fetch the latest persisted AI evaluation from the database."""
    repo = SqlAiRepository(session)
    result = await repo.get_latest(feature, entity_key)
    if not result:
        raise HTTPException(status_code=404, detail=f"No AI evaluation found for {feature}:{entity_key}")
    return result


@router.post("/evaluation")
async def save_ai_evaluation(
    req: AiEvaluationSaveRequest,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Save/persist a newly generated AI evaluation into the database and record history."""
    repo = SqlAiRepository(session)

    gen_dt = None
    if req.generated_at:
        try:
            # Handle ISO string with or without Z
            iso_str = req.generated_at.replace("Z", "+00:00")
            gen_dt = datetime.fromisoformat(iso_str)
        except Exception:
            gen_dt = datetime.now(timezone.utc)
    else:
        gen_dt = datetime.now(timezone.utc)

    saved = await repo.upsert_evaluation(
        feature=req.feature,
        entity_key=req.entity_key,
        payload=req.payload,
        source=req.source,
        generated_at=gen_dt,
    )
    return saved


@router.get("/evaluation/history")
async def get_ai_evaluation_history(
    feature: str = Query(..., description="Feature name e.g. company, market, chart, news, agent_scan"),
    entity_key: str = Query(..., description="Entity identifier e.g. NABIL, GLOBAL, NABIL:1D, 123, LATEST"),
    limit: int = Query(10, ge=1, le=50),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    """Fetch previous historical evaluations generated for an entity."""
    repo = SqlAiRepository(session)
    return await repo.list_history(feature, entity_key, limit=limit)


@router.get("/company/{symbol}")
async def evaluate_company_ai(
    symbol: str,
    refresh: bool = Query(False),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Evaluates company fundamentals. Returns persisted database analysis unless refresh is requested."""
    sym = symbol.upper().strip()
    repo = SqlAiRepository(session)

    # 1. Check if we have previously generated data stored in the database
    if not refresh:
        stored = await repo.get_latest("company", sym)
        if stored:
            return stored

    # 2. If not stored or refresh requested, delegate to generator runner
    url = f"{NEXTJS_HOST_URL}/api/ai/company/{sym}"
    params = {"refresh": "true"} if refresh else {}
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                # Persist to database
                await repo.upsert_evaluation(
                    feature="company",
                    entity_key=sym,
                    payload=data,
                    source=data.get("source", "agy"),
                )
                return data
    except Exception:
        pass

    # 3. If runner fails but we have previous data in database, return the previous data!
    fallback_stored = await repo.get_latest("company", sym)
    if fallback_stored:
        return fallback_stored

    # 4. Final heuristic fallback
    return {
        "symbol": sym,
        "verdict": "ACCUMULATE ON DIPS",
        "is_best_time": True,
        "timing_assessment": "Fundamental analysis pending; consult company valuation card.",
        "wait_reason": None,
        "short_term_range": {"min": 0, "max": 0, "target": 0, "outlook": "Consolidation zone"},
        "long_term_range": {"min": 0, "max": 0, "target": 0, "outlook": "Long term investment"},
        "fundamental_score": 70,
        "valuation_status": "FAIR",
        "strengths": ["Active listing on NEPSE"],
        "risks": ["General market volatility"],
        "catalysts": ["Quarterly report"],
        "summary": f"Fundamental valuation for {sym}.",
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "source": "fallback",
    }


@router.get("/market")
async def evaluate_market_ai(
    refresh: bool = Query(False),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Analyzes market status and confidence. Returns persisted database analysis unless refresh requested."""
    repo = SqlAiRepository(session)

    # 1. Check if we have previously generated data stored in database
    if not refresh:
        stored = await repo.get_latest("market", "GLOBAL")
        if stored:
            return stored

    url = f"{NEXTJS_HOST_URL}/api/ai/market"
    params = {"refresh": "true"} if refresh else {}
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                await repo.upsert_evaluation(
                    feature="market",
                    entity_key="GLOBAL",
                    payload=data,
                    source=data.get("source", "agy"),
                )
                return data
    except Exception:
        pass

    fallback_stored = await repo.get_latest("market", "GLOBAL")
    if fallback_stored:
        return fallback_stored

    return {
        "market_status": "MODERATELY BULLISH",
        "confidence_score": 70,
        "confidence_level": "MODERATE",
        "sentiment": "Neutral / Selective",
        "breadth_evaluation": "Stable market breadth.",
        "turnover_evaluation": "Normal turnover.",
        "key_drivers": ["Index support"],
        "risks": ["Resistance levels"],
        "actionable_advice": "Focus on fundamentally strong equities.",
        "summary": "NEPSE market session overview.",
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "source": "fallback",
    }
