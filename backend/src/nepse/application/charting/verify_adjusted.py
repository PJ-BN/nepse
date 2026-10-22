"""Compare our adjusted closes (close x adj_factor) with an independent adjusted reference, per symbol."""
import logging
from dataclasses import dataclass, field
from datetime import date

from nepse.application.charting.ports import AdjustedReference, ChartRepository

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class Deviation:
    trade_date: date
    ours: float
    reference: float
    pct: float


@dataclass(frozen=True)
class SymbolReport:
    symbol: str
    compared: int
    max_pct: float
    mean_pct: float
    breaches: list[Deviation] = field(default_factory=list)  # dates with |deviation| > tolerance


def compare(symbol: str, ours: dict[date, float], ref: dict[date, float], tolerance_pct: float) -> SymbolReport:
    devs = [Deviation(d, ours[d], ref[d], abs(ours[d] - ref[d]) / ref[d] * 100) for d in sorted(ours.keys() & ref.keys()) if ref[d]]
    if not devs:
        return SymbolReport(symbol, 0, 0.0, 0.0)
    return SymbolReport(symbol, len(devs), max(x.pct for x in devs), sum(x.pct for x in devs) / len(devs),
                        [x for x in devs if x.pct > tolerance_pct])


async def verify_adjusted(
    repo: ChartRepository, reference: AdjustedReference, symbols: list[str], start: date, end: date,
    tolerance_pct: float = 0.5,
) -> list[SymbolReport]:
    reports = []
    for symbol in symbols:
        try:
            theirs = await reference.adjusted_closes(symbol, start, end)
        except Exception:  # one unreachable symbol must not abort the sweep
            log.exception("verify-adjusted: %s reference fetch failed", symbol)
            continue
        ours = {b.trade_date: b.close * b.adj_factor for b in await repo.bars(symbol, start, end)}
        report = compare(symbol, ours, theirs, tolerance_pct)
        reports.append(report)
        if report.breaches:
            log.warning("verify-adjusted %s: max %.2f%% mean %.3f%% over %d days; %d beyond %.2f%% (first %s)",
                        symbol, report.max_pct, report.mean_pct, report.compared, len(report.breaches),
                        tolerance_pct, report.breaches[0].trade_date)
    return reports
