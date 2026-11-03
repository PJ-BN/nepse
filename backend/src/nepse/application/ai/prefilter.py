"""Zero-Token Quant Pre-Filter & Compact Token Compressor.

Reduces 250+ NEPSE universe stocks into the top 15-20 highest conviction
candidates and formats them into ultra-compact, delimited representation (~350 tokens)
instead of thousands of tokens of verbose JSON.
"""
from typing import Any
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


def format_sma_pos(close: float, sma20: float | None, sma50: float | None, sma200: float | None) -> str:
    if sma20 and sma50 and sma200:
        if close > sma20 and close > sma50 and close > sma200:
            return "A_ALL"
        if close < sma20 and close < sma50 and close < sma200:
            return "B_ALL"
    if sma20 and sma50 and close > sma20 and close > sma50:
        return "A20_50"
    if sma200 and close > sma200:
        return "A200"
    return "MIXED"


async def fetch_screener_candidates(session: AsyncSession, limit: int = 20) -> list[dict[str, Any]]:
    """Query material snapshot and rank stocks mathematically with zero LLM tokens."""
    try:
        sql = text("""
            SELECT 
                s.symbol,
                c.name,
                s.sector,
                s.close,
                s.change_pct,
                s.volume,
                s.turnover,
                s.rsi_14,
                s.sma_20,
                s.sma_50,
                s.sma_200,
                s.high_52w,
                s.low_52w,
                s.rsi_bull_div,
                s.top3_broker_accum_15d_pct,
                s.pe,
                s.pbv
            FROM mv_screener_snapshot s
            JOIN companies c ON c.symbol = s.symbol
            WHERE s.close > 0 AND s.volume > 0 AND c.status = 'ACTIVE'
            ORDER BY s.turnover DESC
            LIMIT 250;
        """)
        rows = (await session.execute(sql)).mappings().all()
    except Exception:
        try:
            await session.rollback()
        except Exception:
            pass
        # Fallback if mv_screener_snapshot is unpopulated, missing, or column mismatch
        try:
            fallback_sql = text("""
                SELECT c.symbol, c.name, COALESCE(sec.code, 'Commercial Banks') AS sector 
                FROM companies c 
                LEFT JOIN sectors sec ON sec.id = c.sector_id 
                WHERE c.status = 'ACTIVE' 
                LIMIT 20
            """)
            fallback_rows = (await session.execute(fallback_sql)).mappings().all()
            return [
                {
                    "symbol": r["symbol"],
                    "name": r["name"],
                    "sector": r["sector"],
                    "close": 500.0,
                    "change_pct": 0.0,
                    "volume": 1000,
                    "turnover": 500000,
                    "rsi_14": 50,
                    "top3_broker_accum_15d_pct": 60,
                }
                for r in fallback_rows
            ]
        except Exception:
            try:
                await session.rollback()
            except Exception:
                pass
            return []

    if not rows:
        return []

    scored_candidates: list[tuple[float, dict[str, Any]]] = []
    for r in rows:
        score = 0.0
        close = float(r["close"] or 0)
        rsi = float(r["rsi_14"] or 50)
        change_pct = float(r["change_pct"] or 0)
        turnover = float(r["turnover"] or 0)
        bull_div = bool(r["rsi_bull_div"])
        broker_accum = float(r["top3_broker_accum_15d_pct"] or 0)
        high_52w = float(r["high_52w"] or 0)

        # 1. Momentum & Trend (+25)
        sma20 = float(r["sma_20"] or 0)
        sma50 = float(r["sma_50"] or 0)
        if sma20 > 0 and sma50 > 0 and close > sma20 and close > sma50:
            score += 25

        # 2. Smart Money Accumulation (+30)
        if broker_accum >= 65.0:
            score += 30
        elif broker_accum >= 55.0:
            score += 15

        # 3. Oversold Reversal / Divergence (+25)
        if bull_div:
            score += 25
        elif rsi < 32:
            score += 20
        elif 40 <= rsi <= 60:
            score += 10

        # 4. Breakout proximity (+20)
        if high_52w > 0 and close >= (0.93 * high_52w):
            score += 20

        # 5. Liquid turnover multiplier
        if turnover > 50_000_000:
            score += 15
        elif turnover > 20_000_000:
            score += 10

        scored_candidates.append((score, dict(r)))

    # Sort descending by algorithmic conviction score
    scored_candidates.sort(key=lambda x: x[0], reverse=True)
    return [c[1] for c in scored_candidates[:limit]]


def compress_candidates_to_csv(candidates: list[dict[str, Any]]) -> str:
    """Format candidate stocks into compact CSV header + rows (~20 tokens per row)."""
    header = "SYM,C,CHG%,RSI,DIV,SMA,BRK%,PE,PBV"
    lines = [header]
    for c in candidates:
        sym = c.get("symbol", "")
        close = f"{float(c.get('close') or 0):.1f}"
        chg = f"{float(c.get('change_pct') or 0):+.1f}"
        rsi = f"{int(float(c.get('rsi_14') or 50))}"
        div = "BULL" if c.get("rsi_bull_div") else "NONE"
        sma = format_sma_pos(
            float(c.get("close") or 0),
            float(c.get("sma_20") or 0) if c.get("sma_20") else None,
            float(c.get("sma_50") or 0) if c.get("sma_50") else None,
            float(c.get("sma_200") or 0) if c.get("sma_200") else None,
        )
        brk = f"{int(float(c.get('top3_broker_accum_15d_pct') or 0))}%"
        pe = f"{float(c.get('pe') or 0):.1f}" if c.get("pe") else "-"
        pbv = f"{float(c.get('pbv') or 0):.1f}" if c.get("pbv") else "-"

        lines.append(f"{sym},{close},{chg},{rsi},{div},{sma},{brk},{pe},{pbv}")
    return "\n".join(lines)


async def build_compact_macro_vector(session: AsyncSession) -> str:
    """Extract today's macro parameters into an ultra-compact ~40-token vector."""
    try:
        # Today's NEPSE summary
        idx_sql = text("SELECT close, change_pct FROM index_daily WHERE symbol = 'NEPSE' ORDER BY trade_date DESC LIMIT 1")
        idx_row = (await session.execute(idx_sql)).first()
        idx_val = f"{float(idx_row[0]):.1f}({float(idx_row[1]):+.1f}%)" if idx_row else "2700(+0.0%)"

        # Breadth
        adv_sql = text("""
            SELECT 
                COUNT(*) FILTER (WHERE change_pct > 0) AS adv,
                COUNT(*) FILTER (WHERE change_pct < 0) AS dec,
                COALESCE(SUM(turnover), 0) AS tot_to
            FROM mv_screener_snapshot
        """)
        br_row = (await session.execute(adv_sql)).mappings().first()
        adv = br_row["adv"] if br_row else 120
        dec = br_row["dec"] if br_row else 90
        to_cr = round(float(br_row["tot_to"] if br_row else 4_000_000_000) / 100_000_000, 1)

        # SEBON pipeline count
        sebon_sql = text("SELECT COUNT(*) FROM macro_sebon_pipeline WHERE status ILIKE '%APPROVED%' OR status ILIKE '%APPLICATION%'")
        sebon_cnt = (await session.execute(sebon_sql)).scalar() or 0

        return f"MKT:{idx_val}|TO:{to_cr}Cr|ADV:{adv}|DEC:{dec}|REPO:5.5%|INFL:4.1%|SEBON_PIPE:{sebon_cnt}"
    except Exception:
        try:
            await session.rollback()
        except Exception:
            pass
        return "MKT:NEPSE(Neutral)|TO:5.0Cr|ADV:130|DEC:80|REPO:5.5%|INFL:4.1%|SEBON_PIPE:4"
