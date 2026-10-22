"""Store a quarterly report PDF's figures for a listed company (parsing lives in infrastructure)."""
from collections.abc import Callable

from nepse.application.fundamentals.ports import FundamentalsRepository, QuarterRow
from nepse.domain.calendar.bs_calendar import fiscal_quarter_range
from nepse.domain.fundamentals.fiscal_year import fy_start_year
from nepse.domain.fundamentals.sector_metrics import validate_sector_metrics


async def ingest_report_pdf(symbol: str, repo: FundamentalsRepository, pdf: bytes, parse: Callable,
                            fy_bs: str | None = None, quarter: int | None = None) -> QuarterRow:
    """`parse(bytes)` returns an object with fy_bs, quarter, common and sector_metrics (report_pdf.ParsedReport)."""
    report = parse(pdf)
    fy_bs, quarter = fy_bs or report.fy_bs, quarter or report.quarter
    if not fy_bs or not quarter:
        raise ValueError("report period not found in the PDF; pass fy_bs and quarter")
    company = await repo.company(symbol.upper())
    if company is None:
        raise LookupError(f"unknown symbol {symbol.upper()}; ingest its financials first")
    c = report.common
    row = QuarterRow(
        fy_bs=fy_bs, quarter=quarter, period_end=fiscal_quarter_range(fy_start_year(fy_bs), quarter)[1],
        sector_metrics=validate_sector_metrics(company.sector_code, report.sector_metrics),
        **{k: c.get(k) for k in ("paid_up_capital", "reserves", "net_profit", "eps", "bvps", "total_assets",
                                 "total_debt", "cash", "distributable_profit")},
    )
    await repo.upsert_quarter(company.id, row)
    return row
