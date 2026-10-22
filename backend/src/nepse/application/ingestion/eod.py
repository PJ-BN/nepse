import logging
from dataclasses import dataclass, field

from nepse.application.ingestion.ports import IngestionRepository, MarketDataSource

log = logging.getLogger(__name__)


@dataclass
class EodReport:
    business_date: str = ""
    companies: int = 0
    daily_bars: int = 0
    index_bars: int = 0
    floorsheet_ticks: int = 0
    unknown_symbols: set[str] = field(default_factory=set)


async def run_eod(source: MarketDataSource, repo: IngestionRepository) -> EodReport:
    """Persist NEPSE's latest business day. Idempotent: safe to rerun, and a holiday rerun is a no-op."""
    upstream = await source.market_open()
    business_date = upstream.as_of.date()
    report = EodReport(business_date=business_date.isoformat())

    report.companies = await repo.upsert_companies(await source.listed_companies())
    report.daily_bars, unknown = await repo.upsert_daily_bars(await source.today_prices())
    report.unknown_symbols |= unknown
    report.index_bars = await repo.upsert_index_bars(await source.index_bars())

    async for page in source.floorsheet():
        brokers = {t.buyer_broker: t.buyer_name for t in page if t.buyer_name}
        brokers |= {t.seller_broker: t.seller_name for t in page if t.seller_name}
        await repo.upsert_brokers(brokers)
        inserted, unknown = await repo.insert_floorsheet(page)
        report.floorsheet_ticks += inserted
        report.unknown_symbols |= unknown

    await repo.refresh_broker_aggregates(business_date, business_date)
    if report.unknown_symbols:
        log.warning("EOD skipped rows for symbols not in companies: %s", sorted(report.unknown_symbols))
    return report
