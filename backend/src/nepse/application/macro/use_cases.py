"""Macro use cases: sector RRG, macro radar with the liquidity regime, SEBON issue pipeline, ingestion."""
from dataclasses import asdict
from datetime import date, timedelta

from nepse.application.macro.ports import (
    CD_RATIO, INDICATORS, INTERBANK_RATE, MacroRepository, NrbSource, SebonSource,
)
from nepse.domain.macro.liquidity_regime import liquidity_regime
from nepse.domain.market.indices import SECTORS
from nepse.domain.technicals.rrg import compute_rrg

BENCHMARK = "NEPSE"
SECTOR_INDICES = tuple(idx for _, idx in SECTORS.values())
RRG_WINDOW = 10
# calendar days of history: 10-day window -> ratio + momentum need ~20 sessions plus the tail;
# 10-week window needs ~20 weeks plus the tail.
RRG_LOOKBACK = {"daily": 120, "weekly": 500}


async def get_rrg(repo: MacroRepository, timeframe: str = "daily", tail: int = 8,
                  today: date | None = None) -> dict:
    if timeframe not in RRG_LOOKBACK:
        raise ValueError("timeframe must be daily or weekly")
    since = (today or date.today()) - timedelta(days=RRG_LOOKBACK[timeframe])
    closes = await repo.index_closes((BENCHMARK, *SECTOR_INDICES), since)
    bench = closes.pop(BENCHMARK, [])
    names = {idx: name for name, idx in SECTORS.values()}
    tails = compute_rrg(closes, bench, RRG_WINDOW, tail, weekly=timeframe == "weekly")
    return {
        "benchmark": BENCHMARK,
        "timeframe": timeframe,
        "window": RRG_WINDOW,
        "sectors": [
            {"code": t.code, "name": names.get(t.code, t.code), "quadrant": t.quadrant.value,
             "tail": [{"date": p.day, "rs_ratio": p.rs_ratio, "rs_momentum": p.rs_momentum} for p in t.tail]}
            for t in tails
        ],
    }


async def get_macro_radar(repo: MacroRepository, days: int = 365, today: date | None = None) -> dict:
    since = (today or date.today()) - timedelta(days=days)
    series = await repo.series(INDICATORS, since)
    nepse = (await repo.index_closes((BENCHMARK,), since)).get(BENCHMARK, [])
    regime = liquidity_regime(series.get(CD_RATIO, []), series.get(INTERBANK_RATE, []))
    return {
        "nepse": [{"date": d, "value": v} for d, v in nepse],
        "series": {k: [{"date": d, "value": v} for d, v in rows] for k, rows in series.items()},
        "regime": asdict(regime) if regime else None,
    }


async def get_ipo_pipeline(repo: MacroRepository) -> list[dict]:
    return [asdict(r) for r in await repo.issues()]


async def ingest_nrb(source: NrbSource, repo: MacroRepository) -> int:
    """Scheduler job (18:00 NPT)."""
    return await repo.upsert_observations(await source.fetch())


async def ingest_sebon(source: SebonSource, repo: MacroRepository) -> int:
    """Scheduler job (19:00 NPT)."""
    return await repo.upsert_issues(await source.fetch())
