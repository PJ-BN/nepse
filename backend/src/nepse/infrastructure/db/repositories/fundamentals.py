"""Postgres adapter for application.fundamentals.ports.FundamentalsRepository."""
from dataclasses import asdict, fields
from datetime import timedelta
from decimal import Decimal

from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from nepse.application.fundamentals.ports import CompanyRow, DividendRecord, NavRow, PriceInfo, QuarterRow
from nepse.infrastructure.db.models import Company, OhlcvDaily, Sector
from nepse.infrastructure.db.models_fundamentals import Dividend, MutualFundNav, QuarterlyFinancials

_QUARTER_COLS = [f.name for f in fields(QuarterRow)]


def _f(x):
    return float(x) if isinstance(x, Decimal) else x


class SqlFundamentalsRepository:
    def __init__(self, session: AsyncSession):
        self.s = session

    async def company(self, symbol: str) -> CompanyRow | None:
        row = (await self.s.execute(
            select(Company, Sector.code).outerjoin(Sector, Company.sector_id == Sector.id).where(Company.symbol == symbol)
        )).first()
        if row is None:
            return None
        c, code = row
        return CompanyRow(id=c.id, symbol=c.symbol, name=c.name, sector_code=code, instrument_type=c.instrument_type,
                          listed_shares=c.listed_shares, public_shares=c.public_shares,
                          promoter_shares=c.promoter_shares, paid_up_capital=_f(c.paid_up_capital),
                          listing_date=c.listing_date, promoter_lockin_expiry=c.promoter_lockin_expiry)

    async def create_company(self, symbol: str, name: str, sector_code: str | None) -> CompanyRow:
        sector_id = await self.s.scalar(select(Sector.id).where(Sector.code == sector_code)) if sector_code else None
        await self.s.execute(insert(Company).values(
            symbol=symbol, name=name, sector_id=sector_id,
            instrument_type="MUTUAL_FUND" if sector_code == "MUTUAL" else "EQUITY",
        ).on_conflict_do_nothing(index_elements=["symbol"]))
        await self.s.commit()
        return await self.company(symbol)

    async def update_company_shares(self, company_id: int, *, listed: float | None, promoter: int | None,
                                    public: int | None, paid_up_capital: float | None) -> None:
        values = {k: v for k, v in {
            "listed_shares": int(listed) if listed else None, "promoter_shares": promoter,
            "public_shares": public, "paid_up_capital": paid_up_capital,
        }.items() if v is not None}
        if values:
            await self.s.execute(update(Company).where(Company.id == company_id).values(**values))
            await self.s.commit()

    async def upsert_quarter(self, company_id: int, row: QuarterRow) -> None:
        stmt = insert(QuarterlyFinancials).values(company_id=company_id, **asdict(row))
        # A re-scrape never blanks out a value an earlier source (or manual filing entry) already supplied.
        keep = {c: func.coalesce(stmt.excluded[c], getattr(QuarterlyFinancials, c))
                for c in _QUARTER_COLS if c not in ("fy_bs", "quarter")}
        await self.s.execute(stmt.on_conflict_do_update(index_elements=["company_id", "fy_bs", "quarter"], set_=keep))
        await self.s.commit()

    async def upsert_dividends(self, company_id: int, rows: list[DividendRecord]) -> int:
        # Sites repeat a fiscal year without a book-closure date; one row per key or ON CONFLICT hits it twice.
        unique = {(r.fy_bs, r.book_closure_date): r for r in reversed(rows)}
        if not unique:
            return 0
        stmt = insert(Dividend).values([{"company_id": company_id, **asdict(r)} for r in unique.values()])
        stmt = stmt.on_conflict_do_update(
            index_elements=["company_id", "fy_bs", "book_closure_date"],
            set_={c: stmt.excluded[c] for c in ("bonus_pct", "cash_pct", "right_ratio", "announced_on")},
        )
        await self.s.execute(stmt)
        await self.s.commit()
        return len(unique)

    async def quarters(self, company_id: int, limit: int) -> list[QuarterRow]:
        rows = (await self.s.scalars(
            select(QuarterlyFinancials).where(QuarterlyFinancials.company_id == company_id)
            .order_by(QuarterlyFinancials.period_end.desc()).limit(limit)
        )).all()
        return [QuarterRow(**{c: _f(getattr(r, c)) for c in _QUARTER_COLS}) for r in rows]

    async def dividends(self, company_id: int) -> list[DividendRecord]:
        rows = (await self.s.scalars(
            select(Dividend).where(Dividend.company_id == company_id)
            .order_by(Dividend.fy_bs.desc(), Dividend.book_closure_date.desc().nulls_last())
        )).all()
        return [DividendRecord(fy_bs=r.fy_bs, bonus_pct=float(r.bonus_pct), cash_pct=float(r.cash_pct),
                               right_ratio=r.right_ratio, book_closure_date=r.book_closure_date,
                               announced_on=r.announced_on) for r in rows]

    async def latest_price(self, company_id: int) -> PriceInfo | None:
        last = (await self.s.execute(
            select(OhlcvDaily.close, OhlcvDaily.trade_date).where(OhlcvDaily.company_id == company_id)
            .order_by(OhlcvDaily.trade_date.desc()).limit(1)
        )).first()
        if last is None or last.close is None:
            return None
        hi, lo = (await self.s.execute(
            select(func.max(OhlcvDaily.high), func.min(OhlcvDaily.low)).where(
                OhlcvDaily.company_id == company_id, OhlcvDaily.trade_date > last.trade_date - timedelta(days=365))
        )).one()
        return PriceInfo(close=float(last.close), trade_date=last.trade_date, high_52w=_f(hi), low_52w=_f(lo))

    async def latest_nav(self, company_id: int) -> NavRow | None:
        r = await self.s.scalar(select(MutualFundNav).where(MutualFundNav.company_id == company_id)
                                .order_by(MutualFundNav.nav_date.desc()).limit(1))
        return r and NavRow(nav_date=r.nav_date, weekly_nav=_f(r.weekly_nav), monthly_nav=_f(r.monthly_nav))
