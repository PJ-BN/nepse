"""End-of-day market source: the latest ohlcv_daily / index_daily rows."""
from datetime import datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from nepse.application.market.ports import IndexValue, Quote
from nepse.domain.calendar.npt import NPT
from nepse.domain.market.session import CONTINUOUS_END, MarketStatus


def _change(value: float, prev: float | None) -> tuple[float, float]:
    if not prev:
        return 0.0, 0.0
    change = round(value - prev, 2)
    return change, round(change / prev * 100, 2)


class SqlEodMarketSource:
    def __init__(self, session: AsyncSession):
        self.s = session

    async def status(self) -> MarketStatus | None:
        return None

    async def as_of(self) -> datetime | None:
        d = await self.s.scalar(text("SELECT max(trade_date) FROM ohlcv_daily"))
        return datetime.combine(d, CONTINUOUS_END, NPT) if d else None

    async def quotes(self) -> list[Quote]:
        rows = await self.s.execute(text("""
            SELECT c.symbol, o.close, o.volume, o.turnover,
                   coalesce(o.prev_close, (SELECT p.close FROM ohlcv_daily p
                                           WHERE p.company_id = o.company_id AND p.trade_date < o.trade_date
                                           ORDER BY p.trade_date DESC LIMIT 1)) AS prev
            FROM ohlcv_daily o JOIN companies c ON c.id = o.company_id
            WHERE o.trade_date = (SELECT max(trade_date) FROM ohlcv_daily) AND o.close IS NOT NULL"""))
        out = []
        for r in rows:
            close = float(r.close)
            change, pct = _change(close, float(r.prev) if r.prev is not None else None)
            out.append(Quote(r.symbol, close, change, pct, int(r.volume or 0), float(r.turnover or 0)))
        return out

    async def indices(self) -> list[IndexValue]:
        rows = await self.s.execute(text("""
            SELECT index_code, close, turnover, prev FROM (
                SELECT index_code, close, turnover,
                       lag(close) OVER (PARTITION BY index_code ORDER BY trade_date) AS prev,
                       row_number() OVER (PARTITION BY index_code ORDER BY trade_date DESC) AS rn
                FROM index_daily
                WHERE trade_date > (SELECT max(trade_date) FROM index_daily) - 30 AND close IS NOT NULL
            ) t WHERE rn = 1"""))
        out = []
        for r in rows:
            value = float(r.close)
            change, pct = _change(value, float(r.prev) if r.prev is not None else None)
            out.append(IndexValue(r.index_code, value, change, pct,
                                  float(r.turnover) if r.turnover is not None else None))
        return out
