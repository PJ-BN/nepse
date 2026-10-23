from datetime import date, datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from nepse.application.nepse_layers.ports import DailyClose


class SqlNepseLayersRepository:
    def __init__(self, session: AsyncSession):
        self.s = session

    async def daily_closes(self, symbol: str, start: date, end: date) -> list[DailyClose]:
        rows = await self.s.execute(text("""
            SELECT trade_date, prev, adj_factor FROM (
                SELECT o.trade_date, coalesce(o.prev_close, lag(o.close) OVER w) AS prev, o.adj_factor
                FROM ohlcv_daily o JOIN companies c ON c.id = o.company_id
                WHERE c.symbol = :symbol AND o.close IS NOT NULL
                WINDOW w AS (ORDER BY o.trade_date)) t
            WHERE trade_date BETWEEN :start AND :end ORDER BY trade_date"""),
            {"symbol": symbol, "start": start, "end": end})
        return [DailyClose(r.trade_date, None if r.prev is None else float(r.prev), float(r.adj_factor)) for r in rows]

    async def trade_levels(self, symbol: str, start: datetime, end: datetime) -> list[tuple[float, int]]:
        rows = await self.s.execute(text("""
            SELECT t.rate, sum(t.qty)::BIGINT AS qty
            FROM floorsheet_ticks t JOIN companies c ON c.id = t.company_id
            WHERE c.symbol = :symbol AND t.trade_time >= :start AND t.trade_time < :end
            GROUP BY t.rate"""), {"symbol": symbol, "start": start, "end": end})
        return [(float(r.rate), int(r.qty)) for r in rows]
