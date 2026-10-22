"""Scrape-and-store use cases. Scheduling them is feat/ingestion's job; here they are plain async functions."""
from collections.abc import Awaitable, Callable, Sequence
from typing import TypeVar

from nepse.application.fundamentals.ports import (
    DividendSource,
    FundamentalsRepository,
    OwnershipSource,
    QuarterRow,
    SnapshotSource,
    UpstreamError,
)
from nepse.domain.calendar.bs_calendar import fiscal_quarter_range
from nepse.domain.fundamentals.fiscal_year import fy_start_year
from nepse.domain.fundamentals.sector_metrics import validate_sector_metrics

S = TypeVar("S")
T = TypeVar("T")


async def _first_ok(sources: Sequence[S], call: Callable[[S], Awaitable[T]]) -> T:
    """Try each upstream in order; the sites disagree slightly, so the order is the caller's preference."""
    errors = []
    for source in sources:
        try:
            return await call(source)
        except UpstreamError as exc:
            errors.append(f"{type(source).__name__}: {exc}")
    raise UpstreamError("; ".join(errors) or "no sources configured")


async def ingest_financials(symbol: str, repo: FundamentalsRepository, sources: Sequence[SnapshotSource],
                           ownership: OwnershipSource | None = None,
                           sector_metrics: dict | None = None) -> QuarterRow:
    """Store the latest reported quarter for `symbol`. `sector_metrics` (from filings) is validated per sector."""
    symbol = symbol.upper()
    snap = await _first_ok(sources, lambda s: s.financial_snapshot(symbol))
    company = await repo.company(symbol) or await repo.create_company(symbol, snap.name or symbol, snap.sector_code)
    metrics = validate_sector_metrics(company.sector_code or snap.sector_code, sector_metrics)

    split = None
    if ownership is not None:
        try:
            split = await ownership.ownership(symbol)
        except UpstreamError:
            split = None  # ownership is a nice-to-have; never fail the financials over it

    reserves = None
    if snap.bvps is not None and snap.listed_shares and snap.paid_up_capital is not None:
        # Sites publish BVPS, not reserves: net worth (BVPS x shares) minus paid-up capital.
        reserves = round(snap.bvps * snap.listed_shares - snap.paid_up_capital, 2)

    row = QuarterRow(
        fy_bs=snap.fy_bs, quarter=snap.quarter,
        period_end=fiscal_quarter_range(fy_start_year(snap.fy_bs), snap.quarter)[1],
        paid_up_capital=snap.paid_up_capital, reserves=reserves, eps=snap.eps, bvps=snap.bvps,
        sector_metrics=metrics,
    )
    await repo.upsert_quarter(company.id, row)
    await repo.update_company_shares(
        company.id, listed=split.listed_shares if split else snap.listed_shares,
        promoter=split.promoter_shares if split else None, public=split.public_shares if split else None,
        paid_up_capital=snap.paid_up_capital,
    )
    return row


async def ingest_dividends(symbol: str, repo: FundamentalsRepository, sources: Sequence[DividendSource]) -> int:
    symbol = symbol.upper()
    company = await repo.company(symbol)
    if company is None:
        raise LookupError(f"unknown symbol {symbol}; ingest its financials first")
    rows = await _first_ok(sources, lambda s: s.dividends(symbol))
    return await repo.upsert_dividends(company.id, rows)
