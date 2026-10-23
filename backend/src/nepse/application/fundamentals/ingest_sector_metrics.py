"""Store each company's latest quarterly-report sector metrics (NPL, CAR, ...) on its quarterly_financials row."""
import logging

from nepse.application.fundamentals.ports import FundamentalsRepository, QuarterRow, SectorReportSource, UpstreamError
from nepse.domain.calendar.bs_calendar import fiscal_quarter_range
from nepse.domain.fundamentals.fiscal_year import fy_start_year
from nepse.domain.fundamentals.sector_metrics import validate_sector_metrics

log = logging.getLogger(__name__)
BFI_SECTORS = {"BANKING", "DEVBANK", "FINANCE", "MICROFIN"}  # the sectors whose report layout the source understands


async def ingest_sector_metrics(symbols: list[str], repo: FundamentalsRepository, source: SectorReportSource) -> int:
    """Number of companies updated. One upstream failure never blocks the rest; the row is created if missing."""
    stored = 0
    for symbol in symbols:
        company = await repo.company(symbol)
        if company is None or company.sector_code not in BFI_SECTORS:
            continue
        try:
            report = await source.sector_report(symbol)
        except UpstreamError as e:
            log.warning("sector report %s skipped: %s", symbol, e)
            continue
        if report is None:
            continue
        metrics = validate_sector_metrics(company.sector_code, report.metrics)
        end = fiscal_quarter_range(fy_start_year(report.fy_bs), report.quarter)[1]
        await repo.upsert_quarter(company.id, QuarterRow(fy_bs=report.fy_bs, quarter=report.quarter,
                                                         period_end=end, sector_metrics=metrics))
        stored += 1
    return stored
