"""Scheduler process. Jobs are registered here as phases land (live poller, EOD pipeline)."""
import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

# ponytail: single APScheduler process, move to Celery if jobs must spread across machines
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("nepse.worker")


async def main() -> None:
    scheduler = AsyncIOScheduler(timezone="Asia/Kathmandu")
    scheduler.add_job(lambda: log.info("worker alive"), "interval", minutes=5)
    scheduler.start()
    log.info("worker started")
    await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(main())
