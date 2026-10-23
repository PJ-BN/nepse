"""Worker process: wires the NEPSE adapters into the ingestion schedule.

Run once by hand: `python -m nepse.workers.main eod` (or `poll`), or
`python -m nepse.workers.main backfill [SYMBOL ...]` for 10 years of ShareSansar history (resumable).
`python -m nepse.workers.main adjust [SYMBOL ...]` recomputes adj_factor from corporate actions (all by default).
`python -m nepse.workers.main index-backfill` loads about a year of daily bars for all 17 indices.
`python -m nepse.workers.main floorsheet-backfill [DAYS]` loads the last DAYS (90) days of floorsheet (resumable).
"""
import asyncio
import logging
import sys
from datetime import date, time, timedelta

from sqlalchemy import text

from nepse.application.fundamentals.ingest_all import ingest_all, ingest_navs
from nepse.application.ingestion.backfill import backfill
from nepse.application.ingestion.crosscheck import crosscheck_eod
from nepse.application.ingestion.eod import run_eod
from nepse.application.ingestion.floorsheet_backfill import backfill_floorsheet
from nepse.application.macro.use_cases import ingest_nrb, ingest_sebon
from nepse.application.charting.recompute_adjustments import recompute_adjustments
from nepse.application.charting.verify_adjusted import verify_adjusted
from nepse.application.market.poll_live_market import poll_live_market
from nepse.domain.calendar.npt import now_npt
from nepse.infrastructure.cache.redis_client import redis
from nepse.infrastructure.cache.redis_live_store import RedisLiveStore
from nepse.infrastructure.db.repositories.charting import SqlAdjustmentRepository, SqlChartRepository
from nepse.infrastructure.db.repositories.fundamentals import SqlFundamentalsRepository
from nepse.infrastructure.db.repositories.ingestion import SqlIngestionRepository
from nepse.infrastructure.db.repositories.macro import SqlMacroRepository
from nepse.infrastructure.db.repositories.screener import SqlScreenerRepository
from nepse.infrastructure.db.session import SessionLocal, engine
from nepse.infrastructure.scheduler.jobs import DailyJob, build_scheduler
from nepse.infrastructure.upstream import sharesansar
from nepse.infrastructure.upstream.merolagani import MeroLaganiClient
from nepse.infrastructure.upstream.nepalipaisa import NepaliPaisaClient
from nepse.infrastructure.upstream.nepsealpha import NepseAlphaClient
from nepse.infrastructure.upstream.nrb import NrbClient
from nepse.infrastructure.upstream.sebon import SebonClient
from nepse.infrastructure.upstream.nepse.client import NepseClient, new_http_client
from nepse.infrastructure.upstream.nepse.wasm_token import TokenSolver

# ponytail: single APScheduler process, move to Celery if jobs must spread across machines
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logging.getLogger("httpx").setLevel(logging.WARNING)
log = logging.getLogger("nepse.worker")


async def adjust(symbols: list[str] | None) -> int:
    """Recompute adj_factor for companies that have corporate actions (optionally only `symbols`)."""
    sql = "SELECT DISTINCT c.id FROM companies c JOIN corporate_actions a ON a.company_id = c.id"
    async with SessionLocal() as session:
        if symbols:
            ids = (await session.execute(text(sql + " WHERE c.symbol = ANY(:s)"), {"s": symbols})).scalars().all()
        else:
            ids = (await session.execute(text(sql))).scalars().all()
        for company_id in ids:
            await recompute_adjustments(SqlAdjustmentRepository(session), company_id)
    return len(ids)


async def verify_adjusted_job(repo: SqlIngestionRepository, symbols: list[str] | None = None) -> int:
    """Weekly: compare our adjustment factors with NepseAlpha's at each action date (full backfilled history; levels and returns are diagnostics); disagreeing symbols are logged."""
    end = now_npt().date()
    async with SessionLocal() as session:
        reports = await verify_adjusted(SqlChartRepository(session), NepseAlphaClient(),
                                        symbols or await repo.active_symbols(), end - timedelta(days=3650), end)
    for r in sorted(reports, key=lambda r: (-len(r.breaches), -r.max_pct))[:10]:
        log.info("verify-adjusted worst: %s max=%.2f%% mean=%.3f%% factor_mismatches=%d return_gap=%.2fpp", r.symbol, r.max_pct, r.mean_pct, len(r.breaches), r.max_return_diff_pp)
    return sum(bool(r.breaches) for r in reports)


async def refresh_screener() -> None:
    async with SessionLocal() as session:
        await SqlScreenerRepository(session).refresh()


def daily_jobs(repo: SqlIngestionRepository) -> list[DailyJob]:
    """Post-close jobs (NPT). Clients are built here and passed in; add a DailyJob to schedule another."""
    sharesansar_http, nrb, sebon = sharesansar.new_http_client(), NrbClient(), SebonClient()
    merolagani, nepalipaisa = MeroLaganiClient(), NepaliPaisaClient()

    async def crosscheck():
        return await crosscheck_eod(sharesansar.ShareSansarClient(sharesansar_http), repo)

    async def fundamentals(source):
        symbols = await repo.active_symbols()
        async with SessionLocal() as session:
            return len(await ingest_all(symbols, SqlFundamentalsRepository(session), [source],
                                        source if source is nepalipaisa else None))

    async def navs():
        async with SessionLocal() as session:
            return await ingest_navs(sharesansar.ShareSansarClient(sharesansar_http), SqlFundamentalsRepository(session))

    async def paisa():
        return await fundamentals(nepalipaisa), await navs()

    async def macro(use_case, source):
        async with SessionLocal() as session:
            return await use_case(source, SqlMacroRepository(session))

    return [
        DailyJob("eod_crosscheck", time(15, 30), crosscheck),
        DailyJob("fundamentals_merolagani", time(16, 0), lambda: fundamentals(merolagani)),
        DailyJob("fundamentals_nepalipaisa", time(17, 0), paisa),  # + mutual-fund NAVs
        DailyJob("macro_nrb", time(18, 0), lambda: macro(ingest_nrb, nrb)),
        DailyJob("macro_sebon", time(19, 0), lambda: macro(ingest_sebon, sebon)),
        DailyJob("verify_adjusted", time(20, 0), lambda: verify_adjusted_job(repo), days="thu"),  # weekly, after close
    ]


async def main(command: str | None, args: list[str]) -> None:
    if command == "backfill":
        since = date.today() - timedelta(days=365 * 10)
        async with sharesansar.new_http_client() as http:
            report = await backfill(sharesansar.ShareSansarClient(http), SqlIngestionRepository(engine), since, args or None)
        log.info("backfill done=%d skipped=%d failed=%s", len(report.done), len(report.skipped), report.failed)
        if report.done:
            log.info("adjusted %d companies", await adjust(list(report.done)))
        return
    if command == "adjust":
        log.info("adjusted %d companies", await adjust(args or None))
        return
    if command == "job":  # <id>: run one scheduled daily job now, e.g. `job macro_nrb`
        jobs = {j.id: j for j in daily_jobs(SqlIngestionRepository(engine))}
        if not args or args[0] not in jobs:
            raise SystemExit(f"usage: job <{'|'.join(jobs)}>")
        log.info("%s done: %s", args[0], await jobs[args[0]].run())
        return
    if command == "verify-adjusted":  # [SYMBOL...] default: all active symbols
        log.info("verify-adjusted: %d symbols with breaches", await verify_adjusted_job(SqlIngestionRepository(engine), args or None))
        return
    async with new_http_client() as http:
        source = NepseClient(http, redis, TokenSolver())
        store, repo = RedisLiveStore(redis), SqlIngestionRepository(engine)
        if command == "eod":
            log.info("eod %s", await run_eod(source, repo))
            await refresh_screener()
            return
        if command == "poll":
            log.info("poll %s", await poll_live_market(source, store, now_npt()))
            return
        if command == "index-backfill":  # the ~1 year of daily bars for all 17 indices (RRG, macro overlay)
            log.info("index backfill: %d bars", await repo.upsert_index_bars(await source.index_history()))
            return
        if command == "floorsheet-backfill":  # [DAYS] (default 90); resumable, skips days already stored
            end = now_npt().date()
            done = await backfill_floorsheet(source, repo, end - timedelta(days=int(args[0]) if args else 90), end)
            log.info("floorsheet backfill: %d days, %d ticks", len(done), sum(done.values()))
            return
        build_scheduler(source, store, repo, refresh_screener, daily_jobs(repo)).start()
        log.info("worker started")
        await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else None, sys.argv[2:]))
