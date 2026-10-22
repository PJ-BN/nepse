"""NPT cron schedule for ingestion use cases."""
import logging
from datetime import time

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from nepse.application.ingestion.eod import run_eod
from nepse.application.ingestion.ports import IngestionRepository, LiveStore, MarketDataSource
from nepse.application.market.poll_live_market import poll_live_market
from nepse.domain.calendar.npt import now_npt

log = logging.getLogger(__name__)

TRADING_DAYS = "sun,mon,tue,wed,thu"
POLL_START, POLL_END = time(10, 30), time(15, 5)


def build_scheduler(source: MarketDataSource, store: LiveStore, repo: IngestionRepository) -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone="Asia/Kathmandu", job_defaults={"coalesce": True, "max_instances": 1})

    async def poll(force: bool = False) -> None:
        now = now_npt()
        if not force and not POLL_START <= now.time() <= POLL_END:
            return
        try:
            result = await poll_live_market(source, store, now)
            log.info("poll %s quotes=%d indices=%d", result.status, result.quotes_changed, result.indices_changed)
        except Exception:  # one failed poll must not kill the schedule; the next tick retries
            log.exception("live poll failed")

    async def eod() -> None:
        try:
            log.info("eod %s", await run_eod(source, repo))
        except Exception:
            log.exception("EOD pipeline failed")

    # Every 20s inside 10:30-15:05 NPT (cron covers 10:00-15:59; poll() trims to the window).
    scheduler.add_job(poll, "cron", day_of_week=TRADING_DAYS, hour="10-15", second="*/20", id="live_poll")
    scheduler.add_job(eod, "cron", day_of_week=TRADING_DAYS, hour=15, minute=15, id="eod")
    # Seed the live snapshot once at startup so the dashboard has data outside market hours.
    scheduler.add_job(poll, kwargs={"force": True}, id="seed_snapshot")
    return scheduler
