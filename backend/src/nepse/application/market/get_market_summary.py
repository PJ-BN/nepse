"""Dashboard summary: indices, breadth, turnover and top movers; live when Redis has data, else EOD."""
from dataclasses import dataclass, field
from datetime import datetime

from nepse.application.market.ports import IndexValue, MarketSource, Quote
from nepse.domain.market.indices import SECTORS
from nepse.domain.market.session import MarketStatus, market_status

TOP_N = 10
SUB_INDICES = tuple(idx for _, idx in SECTORS.values())


@dataclass
class MarketSummary:
    source: str  # "live" | "eod" | "empty"
    status: MarketStatus
    as_of: datetime | None
    index: IndexValue | None
    sub_indices: list[IndexValue]
    turnover: float
    advances: int
    declines: int
    unchanged: int
    gainers: list[Quote] = field(default_factory=list)
    losers: list[Quote] = field(default_factory=list)
    top_turnover: list[Quote] = field(default_factory=list)
    quotes: list[Quote] = field(default_factory=list)  # every symbol, by turnover (feeds the treemap)


async def get_market_summary(live: MarketSource, eod: MarketSource, now: datetime) -> MarketSummary:
    quotes, indices, source, src = await live.quotes(), await live.indices(), "live", live
    if not quotes and not indices:
        quotes, indices, source, src = await eod.quotes(), await eod.indices(), "eod", eod
        if not quotes and not indices:
            source = "empty"
    by_code = {i.code: i for i in indices}
    by_turnover = sorted(quotes, key=lambda q: -q.turnover)
    return MarketSummary(
        source=source,
        status=await live.status() or market_status(now),  # HALTED is only known from live data
        as_of=await src.as_of(),
        index=by_code.get("NEPSE"),
        sub_indices=[by_code[c] for c in SUB_INDICES if c in by_code],
        turnover=round(sum(q.turnover for q in quotes), 2),
        advances=sum(q.change > 0 for q in quotes),
        declines=sum(q.change < 0 for q in quotes),
        unchanged=sum(q.change == 0 for q in quotes),
        gainers=sorted((q for q in quotes if q.pct_change > 0), key=lambda q: -q.pct_change)[:TOP_N],
        losers=sorted((q for q in quotes if q.pct_change < 0), key=lambda q: q.pct_change)[:TOP_N],
        top_turnover=by_turnover[:TOP_N],
        quotes=by_turnover,
    )
