"""Hourly ShareSansar announcements pull (opens its own session: the scheduler holds none)."""
import logging

from nepse.application.calendar.use_cases import ingest_announcements
from nepse.infrastructure.db.repositories.calendar import SqlCalendarRepository
from nepse.infrastructure.db.session import SessionLocal
from nepse.infrastructure.upstream.sharesansar_announcements import ShareSansarAnnouncements

log = logging.getLogger(__name__)


async def run_announcements() -> None:
    try:
        async with SessionLocal() as session:
            n = await ingest_announcements(ShareSansarAnnouncements(), SqlCalendarRepository(session))
            log.info("announcements upserted=%d", n)
    except Exception:  # the next hour retries
        log.exception("announcements ingest failed")
