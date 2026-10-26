"""IngestionRepository over PostgreSQL/TimescaleDB."""
from dataclasses import asdict
from datetime import date, datetime, time, timedelta

from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncEngine

from nepse.domain.calendar.npt import NPT
from nepse.domain.market.entities import CorporateActionRecord, DailyBar, FloorsheetTick, IndexBar, ListedCompany
from nepse.infrastructure.db.models import Broker, Company, CorporateAction, IndexDaily, OhlcvDaily, Sector
from nepse.infrastructure.db.models import FloorsheetTick as TickRow


class SqlIngestionRepository:
    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    async def _company_ids(self, conn) -> dict[str, int]:
        return dict((await conn.execute(select(Company.symbol, Company.id))).all())

    async def upsert_companies(self, companies: list[ListedCompany]) -> int:
        if not companies:
            return 0
        async with self._engine.begin() as conn:
            sectors = dict((await conn.execute(select(Sector.code, Sector.id))).all())
            rows = [
                {"symbol": c.symbol, "name": c.name, "nepse_id": c.nepse_id, "sector_id": sectors.get(c.sector_code),
                 "instrument_type": c.instrument_type, "status": c.status}
                for c in companies
            ]
            stmt = insert(Company).values(rows)
            await conn.execute(stmt.on_conflict_do_update(
                index_elements=[Company.symbol],
                set_={col: stmt.excluded[col] for col in ("name", "nepse_id", "sector_id", "instrument_type", "status")},
            ))
        return len(rows)

    async def upsert_daily_bars(self, bars: list[DailyBar]) -> tuple[int, set[str]]:
        async with self._engine.begin() as conn:
            ids = await self._company_ids(conn)
            rows, unknown = [], set()
            for b in bars:
                if b.symbol not in ids:
                    unknown.add(b.symbol)
                    continue
                row = asdict(b)
                del row["symbol"]
                rows.append({**row, "company_id": ids[b.symbol]})
            if rows:
                stmt = insert(OhlcvDaily).values(rows)
                # adj_factor is owned by the adjustment engine: never overwrite it here.
                cols = ("open", "high", "low", "close", "prev_close", "volume", "turnover", "transactions")
                await conn.execute(stmt.on_conflict_do_update(
                    index_elements=[OhlcvDaily.company_id, OhlcvDaily.trade_date],
                    set_={c: stmt.excluded[c] for c in cols},
                ))
        return len(rows), unknown

    async def upsert_index_bars(self, bars: list[IndexBar]) -> int:
        if not bars:
            return 0
        async with self._engine.begin() as conn:
            rows = [{"index_code": b.code, "trade_date": b.trade_date, "open": b.open, "high": b.high,
                     "low": b.low, "close": b.close, "turnover": b.turnover} for b in bars]
            stmt = insert(IndexDaily).values(rows)
            await conn.execute(stmt.on_conflict_do_update(
                index_elements=[IndexDaily.index_code, IndexDaily.trade_date],
                set_={c: stmt.excluded[c] for c in ("open", "high", "low", "close", "turnover")},
            ))
        return len(bars)

    async def insert_floorsheet(self, ticks: list[FloorsheetTick]) -> tuple[int, set[str]]:
        async with self._engine.begin() as conn:
            ids = await self._company_ids(conn)
            rows, unknown = [], set()
            for t in ticks:
                if t.symbol not in ids:
                    unknown.add(t.symbol)
                    continue
                rows.append({
                    "contract_no": t.contract_no, "trade_time": t.trade_time, "company_id": ids[t.symbol],
                    "buyer_broker": t.buyer_broker, "seller_broker": t.seller_broker,
                    "qty": t.qty, "rate": t.rate, "amount": t.amount,
                })
            inserted = 0
            if rows:
                result = await conn.execute(insert(TickRow).values(rows).on_conflict_do_nothing())
                inserted = result.rowcount
        return inserted, unknown

    async def upsert_brokers(self, names: dict[int, str]) -> None:
        if not names:
            return
        async with self._engine.begin() as conn:
            stmt = insert(Broker).values([{"id": k, "name": v} for k, v in names.items()])
            await conn.execute(stmt.on_conflict_do_update(index_elements=[Broker.id], set_={"name": stmt.excluded.name}))

    async def upsert_corporate_actions(self, actions: list[CorporateActionRecord]) -> tuple[int, set[str]]:
        async with self._engine.begin() as conn:
            ids = await self._company_ids(conn)
            rows = [
                {"company_id": ids[a.symbol], "book_closure_date": a.book_closure_date, "fiscal_year_bs": a.fiscal_year_bs,
                 "bonus_pct": a.bonus_pct, "right_pct": a.right_pct, "cash_pct": a.cash_pct}
                for a in actions if a.symbol in ids
            ]
            if rows:
                stmt = insert(CorporateAction).values(rows)
                # adj_factor is recomputed by the adjustment engine; only the published entitlements change here.
                await conn.execute(stmt.on_conflict_do_update(
                    index_elements=[CorporateAction.company_id, CorporateAction.book_closure_date],
                    set_={c: stmt.excluded[c] for c in ("fiscal_year_bs", "bonus_pct", "right_pct", "cash_pct")},
                ))
        return len(rows), {a.symbol for a in actions} - ids.keys()

    async def earliest_bar_date(self, symbol: str) -> date | None:
        async with self._engine.connect() as conn:
            return await conn.scalar(
                select(func.min(OhlcvDaily.trade_date)).join(Company, Company.id == OhlcvDaily.company_id)
                .where(Company.symbol == symbol)
            )

    async def active_symbols(self) -> list[str]:
        async with self._engine.connect() as conn:
            rows = await conn.execute(
                select(Company.symbol).where(Company.status == "ACTIVE", Company.instrument_type.in_(["EQUITY", "MUTUAL_FUND"]))
                .order_by(Company.symbol)
            )
            return list(rows.scalars())

    async def refresh_broker_aggregates(self, start: date, end: date) -> None:
        # Continuous-aggregate refresh cannot run inside a transaction.
        window = (datetime.combine(start, time(), NPT), datetime.combine(end + timedelta(days=1), time(), NPT))
        async with self._engine.connect() as conn:
            conn = await conn.execution_options(isolation_level="AUTOCOMMIT")
            for view in ("broker_buy_daily", "broker_sell_daily"):
                await conn.execute(text(f"CALL refresh_continuous_aggregate('{view}', CAST(:start AS timestamptz), CAST(:end AS timestamptz))"),
                                   {"start": window[0], "end": window[1]})

    async def daily_bars_on(self, day: date) -> list[DailyBar]:
        async with self._engine.connect() as conn:
            rows = await conn.execute(
                select(
                    Company.symbol,
                    OhlcvDaily.open,
                    OhlcvDaily.high,
                    OhlcvDaily.low,
                    OhlcvDaily.close,
                    OhlcvDaily.prev_close,
                    OhlcvDaily.volume,
                    OhlcvDaily.turnover,
                    OhlcvDaily.transactions,
                ).join(Company, Company.id == OhlcvDaily.company_id)
                .where(OhlcvDaily.trade_date == day)
            )
            return [
                DailyBar(r.symbol, day, r.open, r.high, r.low, r.close, r.prev_close, r.volume, r.turnover, r.transactions)
                for r in rows
            ]

