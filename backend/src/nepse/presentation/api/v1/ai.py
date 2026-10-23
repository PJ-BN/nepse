import os
import httpx
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/v1/ai", tags=["ai"])

# Next.js host runner runs agy on the host machine
NEXTJS_HOST_URL = os.getenv("NEXTJS_INTERNAL_URL", "http://host.docker.internal:3000")


@router.get("/company/{symbol}")
async def evaluate_company_ai(symbol: str, refresh: bool = Query(False)) -> dict:
    """Evaluates company fundamentals and provides timing advice and price ranges via AGY."""
    url = f"{NEXTJS_HOST_URL}/api/ai/company/{symbol.upper()}"
    params = {"refresh": "true"} if refresh else {}
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        # Fallback if host runner is unavailable
        pass

    return {
        "symbol": symbol.upper(),
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
        "summary": f"Fundamental valuation for {symbol.upper()}.",
        "source": "fallback"
    }


@router.get("/market")
async def evaluate_market_ai(refresh: bool = Query(False)) -> dict:
    """Analyzes market status and confidence score via AGY."""
    url = f"{NEXTJS_HOST_URL}/api/ai/market"
    params = {"refresh": "true"} if refresh else {}
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass

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
        "source": "fallback"
    }
