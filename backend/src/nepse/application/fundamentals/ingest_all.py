import logging
from collections.abc import Sequence

from nepse.application.fundamentals.ingest import ingest_dividends, ingest_financials
from nepse.application.fundamentals.ports import (
    DividendSource, FundamentalsRepository, NavRow, NavSource, OwnershipSource, SnapshotSource,
)

log = logging.getLogger(__name__)


async def ingest_all(symbols: Sequence[str], repo: FundamentalsRepository,
                     sources: Sequence[SnapshotSource | DividendSource],
                     ownership: OwnershipSource | None = None) -> dict[str, str]:
    """Financials then dividends for every EQUITY in `symbols` through `sources`; returns symbol -> error for the ones that failed."""
    failed: dict[str, str] = {}
    skipped = 0
    for symbol in symbols:
        company = await repo.company(symbol.upper())
        if company and company.instrument_type != "EQUITY":  # funds/debentures publish no quarterly EPS (funds get NAVs via ingest_navs)
            skipped += 1
            continue
        try:
            await ingest_financials(symbol, repo, sources, ownership)
            await ingest_dividends(symbol, repo, sources)
        except Exception as exc:  # one bad symbol must not stop the loop
            failed[symbol] = repr(exc)
    log.info("fundamentals ingest: %d ok, %d failed, %d non-equity skipped", len(symbols) - len(failed) - skipped, len(failed), skipped)
    if failed:
        log.warning("fundamentals ingest: failed equities: %s", ", ".join(sorted(failed)))
    return failed


async def ingest_navs(source: NavSource, repo: FundamentalsRepository) -> int:
    """Store the published mutual-fund NAVs; symbols not in companies are ignored."""
    by_company: dict[int, list[NavRow]] = {}
    for symbol, nav in await source.mutual_fund_navs():
        if company := await repo.company(symbol.upper()):
            by_company.setdefault(company.id, []).append(nav)
    return sum([await repo.upsert_navs(cid, rows) for cid, rows in by_company.items()])
