"""FastAPI router for NEPSE financial news, regulatory circulars, and AI impact analysis."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from nepse.application.news.use_cases import (
    generate_news_market_briefing,
    get_company_news,
    get_news_detail,
    get_news_feed,
    ingest_news,
)
from nepse.infrastructure.db.repositories.news import SqlNewsRepository
from nepse.infrastructure.upstream.news_sources import MultiSourceNewsAggregator, get_seed_news
from nepse.presentation.api.schemas.news import NewsBriefingResponse, NewsFeedResponse, NewsItemDto
from nepse.presentation.api.v1.screener import get_session

router = APIRouter(prefix="/api/v1/news", tags=["news"])


@router.get("", response_model=NewsFeedResponse)
async def list_news(
    category: str | None = Query(None, description="Filter by category (regulatory, government, company, macro, sector)"),
    symbol: str | None = Query(None, description="Filter by stock ticker symbol (e.g. NABIL, EBL, CHCL)"),
    search: str | None = Query(None, description="Search term in headline or summary"),
    stance: str | None = Query(None, description="Filter by impact stance (BULLISH, BEARISH, NEUTRAL)"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    repo = SqlNewsRepository(session)
    count = await repo.count()
    # Auto-seed if the table is currently empty
    if count == 0:
        await repo.upsert_many(get_seed_news())

    feed = await get_news_feed(
        repo=repo,
        category=category,
        symbol=symbol,
        search=search,
        stance=stance,
        limit=limit,
        offset=offset,
    )
    return feed


@router.get("/company/{symbol}", response_model=list[NewsItemDto])
async def company_news(
    symbol: str,
    limit: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
):
    repo = SqlNewsRepository(session)
    count = await repo.count()
    if count == 0:
        await repo.upsert_many(get_seed_news())

    return await get_company_news(repo, symbol=symbol, limit=limit)


@router.get("/briefing/latest", response_model=NewsBriefingResponse)
async def news_briefing(session: AsyncSession = Depends(get_session)):
    repo = SqlNewsRepository(session)
    count = await repo.count()
    if count == 0:
        await repo.upsert_many(get_seed_news())

    return await generate_news_market_briefing(repo)


@router.get("/{news_id}", response_model=NewsItemDto)
async def news_detail(news_id: int, session: AsyncSession = Depends(get_session)):
    repo = SqlNewsRepository(session)
    item = await get_news_detail(repo, news_id)
    if not item:
        raise HTTPException(status_code=404, detail="News article not found")
    return item


@router.post("/seed")
async def seed_news(session: AsyncSession = Depends(get_session)):
    repo = SqlNewsRepository(session)
    source = MultiSourceNewsAggregator()
    upserted = await ingest_news(source, repo)
    return {"status": "ok", "upserted": upserted}
