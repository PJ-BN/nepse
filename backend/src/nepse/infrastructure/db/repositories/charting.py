from datetime import date, datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from nepse.application.charting.ports import Bar, IntradayBar, SymbolInfo
from nepse.domain.corporate_actions.adjustment import CorporateAction

_SYMBOL = "SELECT c.symbol, c.name, s.code AS sector FROM companies c LEFT JOIN sectors s ON s.id = c.sector_id"


class SqlChartRepository:
    def __init__(self, session: AsyncSession):
        self.s = session

    async def bars(self, symbol: str, start: date, end: date) -> list[Bar]:
        rows = await self.s.execute(text("""
            SELECT o.trade_date, coalesce(o.open, o.prev_close, o.close) AS open,  -- NEPSE history has no open
                   coalesce(o.high, o.close) AS high, coalesce(o.low, o.close) AS low,
                   o.close, o.volume, o.adj_factor
            FROM ohlcv_daily o JOIN companies c ON c.id = o.company_id
            WHERE c.symbol = :symbol AND o.trade_date BETWEEN :start AND :end AND o.close IS NOT NULL
            ORDER BY o.trade_date"""), {"symbol": symbol, "start": start, "end": end})
        return [
            Bar(r.trade_date, float(r.open), float(r.high), float(r.low), float(r.close), int(r.volume or 0),
                float(r.adj_factor))
            for r in rows
        ]

    async def intraday_bars(self, symbol: str, start: datetime, end: datetime, minutes: int) -> list[IntradayBar]:
        # Buckets anchor at NPT midnight (+05:45) so 60-minute bars line up with the 11:00 open.
        rows = await self.s.execute(text("""
            SELECT time_bucket(make_interval(mins => :minutes), t.trade_time,
                               origin => '2000-01-03 00:00:00+05:45'::timestamptz) AS ts,
                   first(t.rate, t.contract_no) AS open, max(t.rate) AS high, min(t.rate) AS low,
                   last(t.rate, t.contract_no) AS close, sum(t.qty) AS volume
            FROM floorsheet_ticks t JOIN companies c ON c.id = t.company_id
            WHERE c.symbol = :symbol AND t.trade_time >= :start AND t.trade_time < :end
            GROUP BY 1 ORDER BY 1"""), {"symbol": symbol, "start": start, "end": end, "minutes": minutes})
        return [
            IntradayBar(r.ts, float(r.open), float(r.high), float(r.low), float(r.close), int(r.volume))
            for r in rows
        ]

    async def last_date_before(self, symbol: str, d: date) -> date | None:
        return await self.s.scalar(text("""
            SELECT max(o.trade_date) FROM ohlcv_daily o JOIN companies c ON c.id = o.company_id
            WHERE c.symbol = :symbol AND o.trade_date < :d"""), {"symbol": symbol, "d": d})

    async def find_symbol(self, symbol: str) -> SymbolInfo | None:
        r = (await self.s.execute(text(f"{_SYMBOL} WHERE c.symbol = :symbol"), {"symbol": symbol})).first()
        return SymbolInfo(r.symbol, r.name, r.sector) if r else None

    async def search_symbols(self, query: str, limit: int) -> list[SymbolInfo]:
        rows = await self.s.execute(text(f"""
            {_SYMBOL} WHERE c.status = 'ACTIVE' AND (c.symbol ILIKE :prefix OR c.name ILIKE :anywhere)
            ORDER BY c.symbol NOT ILIKE :prefix, c.symbol LIMIT :limit"""),
            {"prefix": f"{query}%", "anywhere": f"%{query}%", "limit": limit})
        return [SymbolInfo(r.symbol, r.name, r.sector) for r in rows]


class SqlAdjustmentRepository:
    def __init__(self, session: AsyncSession):
        self.s = session

    async def closes(self, company_id: int) -> list[tuple[date, float]]:
        rows = await self.s.execute(text("""
            SELECT trade_date, close FROM ohlcv_daily
            WHERE company_id = :cid AND close IS NOT NULL ORDER BY trade_date"""), {"cid": company_id})
        return [(r.trade_date, float(r.close)) for r in rows]

    async def actions(self, company_id: int) -> list[tuple[int, CorporateAction]]:
        rows = await self.s.execute(text("""
            SELECT id, book_closure_date, bonus_pct, right_pct FROM corporate_actions
            WHERE company_id = :cid AND (bonus_pct > 0 OR right_pct > 0) ORDER BY book_closure_date"""),
            {"cid": company_id})
        return [  # the table stores percentages: 10 = 10%
            (r.id, CorporateAction(r.book_closure_date, float(r.bonus_pct) / 100, float(r.right_pct) / 100))
            for r in rows
        ]

    async def save_factors(
        self, company_id: int, daily: list[tuple[date, float]], per_action: list[tuple[int, float]]
    ) -> None:
        if daily:
            # Chunks older than 3 years are compressed (0005_charting); one company's full history can exceed
            # TimescaleDB's default 100k-tuple cap on decompression inside a single UPDATE.
            await self.s.execute(text("SET LOCAL timescaledb.max_tuples_decompressed_per_dml_transaction = 0"))
            await self.s.execute(text("""
                UPDATE ohlcv_daily o SET adj_factor = f.factor::numeric(14, 10)
                FROM unnest(CAST(:dates AS date[]), CAST(:factors AS float8[])) AS f(d, factor)
                WHERE o.company_id = :cid AND o.trade_date = f.d"""),
                {"cid": company_id, "dates": [d for d, _ in daily], "factors": [f for _, f in daily]})
        if per_action:
            await self.s.execute(text("""
                UPDATE corporate_actions a SET adj_factor = f.factor::numeric(14, 10)
                FROM unnest(CAST(:ids AS int[]), CAST(:factors AS float8[])) AS f(id, factor)
                WHERE a.id = f.id"""),
                {"ids": [i for i, _ in per_action], "factors": [f for _, f in per_action]})
        await self.s.commit()
