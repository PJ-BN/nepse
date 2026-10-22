from dataclasses import asdict, fields
from datetime import date

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from nepse.application.macro.ports import IssueRow, Observation
from nepse.infrastructure.db.models import IndexDaily
from nepse.infrastructure.db.models_macro import IpoPipeline, MacroIndicator

_ISSUE_COLS = [f.name for f in fields(IssueRow)]


class SqlMacroRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def upsert_observations(self, rows: list[Observation]) -> int:
        # last one wins within a batch: ON CONFLICT cannot touch the same row twice in one statement
        unique = {(r.indicator, r.obs_date): asdict(r) for r in rows}
        if not unique:
            return 0
        stmt = insert(MacroIndicator).values(list(unique.values()))
        stmt = stmt.on_conflict_do_update(
            index_elements=["indicator", "obs_date"],
            set_={"value": stmt.excluded.value, "source": stmt.excluded.source},
        )
        await self.session.execute(stmt)
        await self.session.commit()
        return len(unique)

    async def series(self, indicators: tuple[str, ...], since: date) -> dict[str, list[tuple[date, float]]]:
        q = (sa.select(MacroIndicator.indicator, MacroIndicator.obs_date, MacroIndicator.value)
             .where(MacroIndicator.indicator.in_(indicators), MacroIndicator.obs_date >= since)
             .order_by(MacroIndicator.indicator, MacroIndicator.obs_date))
        out: dict[str, list[tuple[date, float]]] = {}
        for name, d, v in await self.session.execute(q):
            out.setdefault(name, []).append((d, v))
        return out

    async def index_closes(self, codes: tuple[str, ...], since: date) -> dict[str, list[tuple[date, float]]]:
        q = (sa.select(IndexDaily.index_code, IndexDaily.trade_date, IndexDaily.close)
             .where(IndexDaily.index_code.in_(codes), IndexDaily.trade_date >= since, IndexDaily.close.is_not(None))
             .order_by(IndexDaily.index_code, IndexDaily.trade_date))
        out: dict[str, list[tuple[date, float]]] = {}
        for code, d, c in await self.session.execute(q):
            out.setdefault(code, []).append((d, float(c)))
        return out

    async def upsert_issues(self, rows: list[IssueRow]) -> int:
        # one row per (company, issue_type, stage): the parsers can emit duplicates within a single PDF
        unique = {(r.company, r.issue_type, r.stage): asdict(r) for r in rows}
        if not unique:
            return 0
        stmt = insert(IpoPipeline).values(list(unique.values()))
        stmt = stmt.on_conflict_do_update(
            index_elements=["company", "issue_type", "stage"],
            set_={**{c: stmt.excluded[c] for c in _ISSUE_COLS if c not in ("company", "issue_type", "stage")},
                  "updated_at": sa.func.now()},
        )
        await self.session.execute(stmt)
        await self.session.commit()
        return len(unique)

    async def issues(self) -> list[IssueRow]:
        q = sa.select(*(getattr(IpoPipeline, c) for c in _ISSUE_COLS)).order_by(
            IpoPipeline.stage, IpoPipeline.issue_type, IpoPipeline.approval_date_bs.desc().nulls_last(),
            IpoPipeline.application_date_bs.desc().nulls_last())
        return [IssueRow(*r) for r in await self.session.execute(q)]
