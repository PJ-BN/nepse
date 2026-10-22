"""mv_screener_snapshot queries. The filter AST compiles to SQLAlchemy expressions: column names come only from
the FIELDS whitelist (as column objects, quoted by SQLAlchemy) and every value is a bound parameter."""
from datetime import date, timedelta

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from nepse.application.screener.filter_ast import FIELDS, NUM, OUTPUT_COLUMNS, FieldRef, Group, Node, SortKey
from nepse.infrastructure.db.models import Company, OhlcvDaily

SCREENER_INSTRUMENTS = ("EQUITY", "MUTUAL_FUND")  # same universe as mv_screener_snapshot
_TYPES = {NUM: sa.Float, "str": sa.Text}
SNAPSHOT = sa.table(
    "mv_screener_snapshot",
    *(sa.column(c, sa.Date if c == "trade_date" else _TYPES[FIELDS[c]]) for c in OUTPUT_COLUMNS),
)


def _col(name: str) -> ColumnElement:
    col = SNAPSHOT.c[name]
    # volume is BIGINT: cast so the server types every numeric parameter as float8
    return sa.cast(col, sa.Float) if FIELDS[name] == NUM else col


def compile_filter(node: Node) -> ColumnElement[bool]:
    if isinstance(node, Group):
        parts = [compile_filter(c) for c in node.children]
        return sa.and_(*parts) if node.kind == "and" else sa.or_(*parts)
    col, v = _col(node.field), node.value
    if node.op == "between":
        return col.between(v[0], v[1])  # type: ignore[index]
    if node.op == "in":
        return col.in_(list(v))  # type: ignore[arg-type]
    rhs = _col(v.name) if isinstance(v, FieldRef) else v
    match node.op:
        case "<":
            return col < rhs
        case "<=":
            return col <= rhs
        case ">":
            return col > rhs
        case ">=":
            return col >= rhs
        case "=":
            return col == rhs
        case "!=":
            return col != rhs
    raise ValueError(node.op)  # unreachable: parse_filter whitelists ops


def build_query(node: Node | None, sort: list[SortKey], limit: int) -> sa.Select:
    q = sa.select(SNAPSHOT)
    if node is not None:
        q = q.where(compile_filter(node))
    order = [(SNAPSHOT.c[s.field].desc() if s.desc else SNAPSHOT.c[s.field].asc()).nulls_last() for s in sort]
    return q.order_by(*order, SNAPSHOT.c.symbol).limit(limit)


class SqlScreenerRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def query(self, node: Node | None, sort: list[SortKey], limit: int) -> list[dict]:
        result = await self.session.execute(build_query(node, sort, limit))
        return [dict(r) for r in result.mappings()]

    async def refresh(self) -> None:
        await self.session.execute(sa.text("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_screener_snapshot"))
        await self.session.commit()

    async def adjusted_closes(self, days: int) -> dict[str, list[tuple[date, float]]]:
        """BreadthRepository: adjusted closes of active equities/funds over the last `days` calendar days."""
        last = await self.session.scalar(sa.select(sa.func.max(OhlcvDaily.trade_date)))
        if last is None:
            return {}
        q = (
            sa.select(Company.symbol, OhlcvDaily.trade_date, OhlcvDaily.close * OhlcvDaily.adj_factor)
            .join(Company, Company.id == OhlcvDaily.company_id)
            .where(Company.status == "ACTIVE", sa.cast(Company.instrument_type, sa.Text).in_(SCREENER_INSTRUMENTS),
                   OhlcvDaily.close.is_not(None),
                   OhlcvDaily.trade_date > last - timedelta(days=days))
            .order_by(Company.symbol, OhlcvDaily.trade_date)
        )
        out: dict[str, list[tuple[date, float]]] = {}
        for symbol, d, c in await self.session.execute(q):
            out.setdefault(symbol, []).append((d, float(c)))
        return out
