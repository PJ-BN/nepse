"""Floorsheet reads. Windowed metrics come from the broker continuous aggregates; only the Sankey and the
whale tape touch raw ticks."""
from collections import defaultdict
from datetime import datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from nepse.application.floorsheet.ports import BrokerStockRow, Company
from nepse.domain.calendar.npt import NPT
from nepse.domain.floorsheet.metrics import WHALE_AMOUNT, WHALE_QTY, BrokerDay, Trade

# Every trade has a buyer, so the buy aggregate alone holds every trading day.
WINDOW_START = text("""
    SELECT CASE WHEN NOT :full OR count(*) >= :days THEN min(day) END
    FROM (SELECT DISTINCT day FROM broker_buy_daily ORDER BY day DESC LIMIT :days) d
""")

BROKER_ROWS = """
    SELECT c.symbol, s.code, bd.broker,
           sum(bd.buy_qty), sum(bd.sell_qty), sum(bd.buy_amt), sum(bd.sell_amt), sum(bd.self_trade_qty)
    FROM broker_daily bd
    JOIN companies c ON c.id = bd.company_id
    LEFT JOIN sectors s ON s.id = c.sector_id
    WHERE bd.day >= :start {filters}
    GROUP BY 1, 2, 3
"""

FLOWS = text("""
    SELECT buyer_broker, seller_broker, sum(qty)
    FROM floorsheet_ticks
    WHERE company_id = :cid AND trade_time >= :start
    GROUP BY 1, 2
""")

WHALES = """
    SELECT t.contract_no, c.symbol, t.buyer_broker, t.seller_broker, t.qty, t.rate, t.amount, t.trade_time
    FROM floorsheet_ticks t JOIN companies c ON c.id = t.company_id
    WHERE t.trade_time >= (SELECT max(trade_time) FROM floorsheet_ticks) - INTERVAL '1 day'
      AND (t.qty >= :qty OR t.amount >= :amt) {filters}
    ORDER BY t.trade_time DESC
    LIMIT :limit
"""


class SqlFloorsheetRepository:
    def __init__(self, session: AsyncSession):
        self.s = session

    async def company(self, symbol: str) -> Company | None:
        row = (await self.s.execute(
            text("SELECT id, symbol, public_shares FROM companies WHERE symbol = :s"), {"s": symbol.upper()}
        )).first()
        return Company(*row) if row else None

    async def window_start(self, days: int, *, full: bool = False) -> datetime | None:
        return await self.s.scalar(WINDOW_START, {"days": days, "full": full})

    async def broker_rows(
        self, start: datetime, *, symbol: str | None = None, broker: int | None = None
    ) -> list[BrokerStockRow]:
        filters, params = "", {"start": start}
        if symbol is not None:
            filters += " AND c.symbol = :symbol"
            params["symbol"] = symbol
        if broker is not None:
            filters += " AND bd.broker = :broker"
            params["broker"] = broker
        rows = await self.s.execute(text(BROKER_ROWS.format(filters=filters)), params)
        return [
            BrokerStockRow(sym, sector, BrokerDay(b, int(bq), int(sq), float(ba), float(sa), int(st)))
            for sym, sector, b, bq, sq, ba, sa, st in rows
        ]

    async def ltp(self, company_id: int) -> float | None:
        rate = await self.s.scalar(
            text("SELECT rate FROM floorsheet_ticks WHERE company_id = :cid ORDER BY trade_time DESC LIMIT 1"),
            {"cid": company_id},
        )
        return float(rate) if rate is not None else None

    async def flows(self, company_id: int, start: datetime) -> list[tuple[int, int, int]]:
        rows = await self.s.execute(FLOWS, {"cid": company_id, "start": start})
        return [(b, s, int(q)) for b, s, q in rows]

    async def daily_bars(self, start: datetime) -> dict[str, list[tuple[float, float, float]]]:
        rows = await self.s.execute(text("""
            SELECT c.symbol, o.high, o.low, o.close
            FROM ohlcv_daily o JOIN companies c ON c.id = o.company_id
            WHERE o.trade_date >= :d AND o.high IS NOT NULL AND o.low IS NOT NULL AND o.close IS NOT NULL
            ORDER BY o.trade_date
        """), {"d": start.astimezone(NPT).date()})
        bars: dict[str, list] = defaultdict(list)
        for sym, h, lo, c in rows:
            bars[sym].append((float(h), float(lo), float(c)))
        return bars

    async def recent_whales(self, symbol: str | None, limit: int) -> list[Trade]:
        filters, params = "", {"qty": WHALE_QTY, "amt": WHALE_AMOUNT, "limit": limit}
        if symbol is not None:
            filters = " AND c.symbol = :symbol"
            params["symbol"] = symbol.upper()
        rows = await self.s.execute(text(WHALES.format(filters=filters)), params)
        return [Trade(cn, sym, b, s, q, float(r), float(a), t) for cn, sym, b, s, q, r, a, t in rows]
