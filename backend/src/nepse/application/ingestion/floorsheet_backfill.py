import logging
from datetime import date, timedelta

from nepse.application.ingestion.ports import FloorsheetHistorySource, IngestionRepository

log = logging.getLogger(__name__)
SESSION_WEEKDAYS = {6, 0, 1, 2, 3}  # Sun-Thu (date.weekday(): Mon=0 .. Sun=6)


async def backfill_floorsheet(source: FloorsheetHistorySource, repo: IngestionRepository, start: date,
                              end: date) -> dict[date, int]:
    """Resumable: days that already have ticks are skipped; holidays simply come back empty. Returns ticks per day."""
    have = await repo.floorsheet_days(start, end)
    done: dict[date, int] = {}
    day = start
    while day <= end:
        if day.weekday() in SESSION_WEEKDAYS and day not in have:
            try:
                total = 0
                async for page in source.floorsheet_on(day):
                    brokers = {t.buyer_broker: t.buyer_name for t in page if t.buyer_name}
                    brokers |= {t.seller_broker: t.seller_name for t in page if t.seller_name}
                    await repo.upsert_brokers(brokers)
                    total += (await repo.insert_floorsheet(page))[0]
                done[day] = total
                log.info("floorsheet %s: %d ticks", day, total)
            except Exception:  # one bad day must not stop the backfill; rerun resumes it
                log.exception("floorsheet backfill %s failed", day)
        day += timedelta(days=1)
    if done:
        await repo.refresh_broker_aggregates(min(done), max(done))
    return done
