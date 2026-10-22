import logging
from dataclasses import dataclass, field
from datetime import date

from nepse.application.ingestion.ports import IngestionRepository, TodayPriceSource
from nepse.domain.market.entities import DailyBar

log = logging.getLogger(__name__)
FIELDS = ("open", "high", "low", "close", "volume")


@dataclass
class CrosscheckReport:
    day: date | None = None
    compared: int = 0
    mismatches: list[str] = field(default_factory=list)  # "SYMBOL field stored!=other"
    missing_in_store: list[str] = field(default_factory=list)


def compare_bars(stored: list[DailyBar], other: list[DailyBar]) -> CrosscheckReport:
    mine = {b.symbol: b for b in stored}
    report = CrosscheckReport(day=other[0].trade_date if other else None)
    for b in other:
        s = mine.get(b.symbol)
        if s is None:
            report.missing_in_store.append(b.symbol)
            continue
        report.compared += 1
        report.mismatches += [f"{b.symbol} {f} {getattr(s, f)}!={getattr(b, f)}" for f in FIELDS
                              if getattr(s, f) != getattr(b, f)]
    return report


async def crosscheck_eod(source: TodayPriceSource, repo: IngestionRepository) -> CrosscheckReport:
    """Compare the secondary source's latest session with ohlcv_daily (written by the NEPSE EOD job); log differences."""
    other = await source.today_prices()
    report = compare_bars(await repo.daily_bars_on(other[0].trade_date) if other else [], other)
    log.log(logging.WARNING if report.mismatches or report.missing_in_store else logging.INFO,
            "eod crosscheck %s compared=%d mismatches=%s missing_in_store=%s",
            report.day, report.compared, report.mismatches, report.missing_in_store)
    return report
