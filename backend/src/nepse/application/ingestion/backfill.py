import logging
from dataclasses import dataclass, field
from datetime import date, timedelta

from nepse.application.ingestion.ports import HistorySource, IngestionRepository

log = logging.getLogger(__name__)
RESUME_SLACK = timedelta(days=14)  # first bar can start a little after `since` (holidays, listing gaps)


@dataclass
class BackfillReport:
    done: dict[str, int] = field(default_factory=dict)  # symbol -> bars written
    skipped: list[str] = field(default_factory=list)  # already backfilled
    failed: dict[str, str] = field(default_factory=dict)


async def backfill(source: HistorySource, repo: IngestionRepository, since: date,
                   symbols: list[str] | None = None) -> BackfillReport:
    """Resumable: symbols whose history already reaches back to `since` are skipped; upserts are idempotent."""
    report = BackfillReport()
    for symbol in symbols or await repo.active_symbols():
        earliest = await repo.earliest_bar_date(symbol)
        if earliest is not None and earliest <= since + RESUME_SLACK:
            report.skipped.append(symbol)
            continue
        try:
            bars, actions = await source.history(symbol, since)
            report.done[symbol], _ = await repo.upsert_daily_bars(bars)
            await repo.upsert_corporate_actions(actions)
            log.info("backfilled %s: %d bars, %d corporate actions", symbol, report.done[symbol], len(actions))
        except Exception as exc:  # one bad symbol must not stop a multi-hour backfill
            report.failed[symbol] = repr(exc)
            log.warning("backfill %s failed: %r", symbol, exc)
    return report
