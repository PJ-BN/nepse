"""Compare our adjustment with an independent adjusted reference, per symbol.

NepseAlpha's series is not always a plain multiplicative adjustment, so price levels are only a diagnostic:
the warning is the factor jump around each of our action dates (the days our adj_factor steps), and day-over-day
returns away from those dates are reported alongside.
"""
import logging
from dataclasses import dataclass, field
from datetime import date, timedelta

from nepse.application.charting.ports import AdjustedReference, Bar, ChartRepository

log = logging.getLogger(__name__)
WINDOW = timedelta(days=4)  # book-closure ± this: the reference may step its factor a few days off ours


@dataclass(frozen=True)
class Deviation:
    trade_date: date  # our action date (first day our factor changed)
    ours: float  # our factor jump across the window
    reference: float  # the reference's implied factor jump
    pct: float


@dataclass(frozen=True)
class SymbolReport:
    symbol: str
    compared: int
    max_pct: float  # level diagnostics: |ours - ref| / ref over common days
    mean_pct: float
    max_return_diff_pp: float = 0.0  # largest day-over-day return gap (pct points) away from action dates
    breaches: list[Deviation] = field(default_factory=list)  # action dates where the factor jumps disagree > tolerance


def compare(symbol: str, bars: list[Bar], ref: dict[date, float], tolerance_pct: float) -> SymbolReport:
    rows = [(b.trade_date, b.close * b.adj_factor, ref[b.trade_date], b.close) for b in bars if ref.get(b.trade_date)]
    if not rows:
        return SymbolReport(symbol, 0, 0.0, 0.0)
    levels = [abs(o - r) / r * 100 for _, o, r, _ in rows]
    ours_f = [o / c for _, o, _, c in rows]
    theirs_f = [r / c for _, _, r, c in rows]
    actions = [rows[i][0] for i in range(1, len(rows)) if abs(ours_f[i] / ours_f[i - 1] - 1) > 1e-6]

    breaches = []
    for a in actions:
        inside = [i for i, row in enumerate(rows) if abs(row[0] - a) <= WINDOW]
        lo, hi = inside[0], inside[-1]
        if lo == hi:
            continue
        ours, theirs = ours_f[hi] / ours_f[lo], theirs_f[hi] / theirs_f[lo]
        if (pct := abs(theirs / ours - 1) * 100) > tolerance_pct:
            breaches.append(Deviation(a, ours, theirs, pct))

    ret_diff = max((abs(rows[i][1] / rows[i - 1][1] - rows[i][2] / rows[i - 1][2]) * 100 for i in range(1, len(rows))
                    if all(abs(rows[j][0] - a) > WINDOW for a in actions for j in (i - 1, i))), default=0.0)
    return SymbolReport(symbol, len(rows), max(levels), sum(levels) / len(levels), ret_diff, breaches)


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
        report = compare(symbol, await repo.bars(symbol, start, end), theirs, tolerance_pct)
        reports.append(report)
        if report.breaches:
            worst = max(report.breaches, key=lambda x: x.pct)
            log.warning("verify-adjusted %s: factor disagrees at %d action date(s) beyond %.2f%% (worst %s: ours %.4f, reference %.4f); "
                        "level max %.2f%% mean %.3f%%, return gap %.2fpp over %d days",
                        symbol, len(report.breaches), tolerance_pct, worst.trade_date, worst.ours, worst.reference,
                        report.max_pct, report.mean_pct, report.max_return_diff_pp, report.compared)
    return reports
