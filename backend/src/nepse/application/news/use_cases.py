"""Use cases for financial news feeds, corporate disclosures, regulatory bulletins, and AI synthesis."""
from dataclasses import asdict
from datetime import datetime

from nepse.application.news.ports import NewsRepository, NewsSource
from nepse.domain.calendar.npt import now_npt
from nepse.domain.news.entities import ImpactStance, NewsBriefing, NewsItem


async def get_news_feed(
    repo: NewsRepository,
    category: str | None = None,
    symbol: str | None = None,
    search: str | None = None,
    stance: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    """Fetch paginated news with total count and applied filters."""
    sym = symbol.upper() if symbol else None
    cat = category.lower() if category and category != "all" else None
    stn = stance.upper() if stance and stance != "ALL" else None

    items = await repo.list_news(
        category=cat,
        symbol=sym,
        search=search,
        stance=stn,
        limit=limit,
        offset=offset,
    )
    total = await repo.count(
        category=cat,
        symbol=sym,
        search=search,
        stance=stn,
    )

    return {
        "items": [asdict(item) for item in items],
        "total": total,
        "limit": limit,
        "offset": offset,
        "category": cat,
        "symbol": sym,
    }


async def get_company_news(
    repo: NewsRepository,
    symbol: str,
    limit: int = 20,
) -> list[dict]:
    """Retrieve news and announcements tagged for a specific company."""
    items = await repo.list_news(symbol=symbol.upper(), limit=limit, offset=0)
    return [asdict(item) for item in items]


async def get_news_detail(
    repo: NewsRepository,
    news_id: int,
) -> dict | None:
    item = await repo.get_by_id(news_id)
    return asdict(item) if item else None


async def ingest_news(
    source: NewsSource,
    repo: NewsRepository,
) -> int:
    """Fetch from source and upsert into the database."""
    items = await source.fetch()
    return await repo.upsert_many(items)


async def generate_news_market_briefing(
    repo: NewsRepository,
) -> dict:
    """Synthesizes recent news and regulatory updates into an actionable market briefing."""
    recent_items = await repo.list_news(limit=25, offset=0)

    if not recent_items:
        return asdict(
            NewsBriefing(
                headline="Market Awaiting Catalysts",
                market_stance="NEUTRAL",
                summary="No major regulatory circulars or corporate announcements detected recently.",
                regulatory_takeaway="Monetary and regulatory policies remain in holding pattern.",
                top_opportunities=["Focus on cash-rich dividend yielders with low leverage"],
                top_risks=["Broader market turnover contraction"],
                sector_outlook={"Commercial Banks": "Neutral", "Hydropower": "Neutral"},
                generated_at=now_npt().isoformat(),
            )
        )

    bullish_cnt = sum(1 for item in recent_items if item.impact_stance == "BULLISH")
    bearish_cnt = sum(1 for item in recent_items if item.impact_stance == "BEARISH")

    if bullish_cnt > bearish_cnt + 2:
        stance: ImpactStance = "BULLISH"
        headline = "Risk-On Momentum: Favorable Regulatory & Corporate Catalysts"
        summary = (
            f"Of the last {len(recent_items)} announcements, {bullish_cnt} carry positive corporate or regulatory drivers. "
            "Policy relaxation and dividend announcements support investor sentiment."
        )
    elif bearish_cnt > bullish_cnt + 2:
        stance = "BEARISH"
        headline = "Caution Advised: Regulatory Scrutiny & Earnings Headwinds"
        summary = (
            f"Adverse cues outnumber catalysts ({bearish_cnt} cautious developments). "
            "Investors should exercise caution and manage risk with stop-losses."
        )
    else:
        stance = "NEUTRAL"
        headline = "Balanced Sentiment: Selective Stock-Specific Opportunities"
        summary = (
            f"Market inputs remain mixed across {len(recent_items)} monitored updates. "
            "Broad index direction hinges on banking liquidity and monetary policy clarity."
        )

    # Extract regulatory takeaway
    reg_items = [i for i in recent_items if i.category in ("regulatory", "government")]
    reg_takeaway = (
        reg_items[0].summary
        if reg_items
        else "SEBON and NRB regulatory frameworks remain stable with regular compliance monitoring."
    )

    # Top opportunities and risks
    top_opps = [
        f"{i.symbols[0]}: {i.action_recommendation} ({i.title[:75]}...)"
        for i in recent_items
        if i.impact_stance == "BULLISH" and i.symbols
    ][:3] or ["Selective accumulation in Tier-1 commercial banks on weakness"]

    top_risks = [
        f"{i.symbols[0] if i.symbols else 'Market'}: {i.title[:75]}..."
        for i in recent_items
        if i.impact_stance == "BEARISH"
    ][:3] or ["Liquidity tightness during tax-settlement cycles"]

    # Sector outlook
    sectors = {
        "Commercial Banks": "Accumulate on dips - Credit growth and dividend season approaching",
        "Hydropower": "Selective - Prefer operational projects with uninterrupted PPA",
        "Insurance": "Neutral - Focus on solvency margins and merger synergies",
        "Microfinance": "Consolidating - Watch asset quality and cap directives",
    }

    briefing = NewsBriefing(
        headline=headline,
        market_stance=stance,
        summary=summary,
        regulatory_takeaway=reg_takeaway,
        top_opportunities=top_opps,
        top_risks=top_risks,
        sector_outlook=sectors,
        generated_at=now_npt().isoformat(),
    )
    return asdict(briefing)
