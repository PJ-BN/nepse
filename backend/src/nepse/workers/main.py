"""Worker process: wires the NEPSE adapters into the ingestion schedule.

Run once by hand: `python -m nepse.workers.main eod` (or `poll`), or
`python -m nepse.workers.main backfill [SYMBOL ...]` for 10 years of ShareSansar history (resumable).
"""
import asyncio
import logging
import sys
from datetime import date, timedelta

from nepse.application.ingestion.backfill import backfill
from nepse.application.ingestion.eod import run_eod
from nepse.application.market.poll_live_market import poll_live_market
from nepse.domain.calendar.npt import now_npt
from nepse.infrastructure.cache.redis_client import redis
from nepse.infrastructure.cache.redis_live_store import RedisLiveStore
from nepse.infrastructure.db.repositories.ingestion import SqlIngestionRepository
from nepse.infrastructure.db.session import engine
from nepse.infrastructure.scheduler.jobs import build_scheduler
from nepse.infrastructure.upstream import sharesansar
from nepse.infrastructure.upstream.nepse.client import NepseClient, new_http_client
from nepse.infrastructure.upstream.nepse.wasm_token import TokenSolver

# ponytail: single APScheduler process, move to Celery if jobs must spread across machines
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logging.getLogger("httpx").setLevel(logging.WARNING)
log = logging.getLogger("nepse.worker")


async def main(command: str | None, args: list[str]) -> None:
    if command == "backfill":
        since = date.today() - timedelta(days=365 * 10)
        async with sharesansar.new_http_client() as http:
            report = await backfill(sharesansar.ShareSansarClient(http), SqlIngestionRepository(engine), since, args or None)
        log.info("backfill done=%d skipped=%d failed=%s", len(report.done), len(report.skipped), report.failed)
        return
    async with new_http_client() as http:
        source = NepseClient(http, redis, TokenSolver())
        store, repo = RedisLiveStore(redis), SqlIngestionRepository(engine)
        if command == "eod":
            log.info("eod %s", await run_eod(source, repo))
            return
        if command == "poll":
            log.info("poll %s", await poll_live_market(source, store, now_npt()))
            return
        build_scheduler(source, store, repo).start()
        log.info("worker started")
        await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else None, sys.argv[2:]))
