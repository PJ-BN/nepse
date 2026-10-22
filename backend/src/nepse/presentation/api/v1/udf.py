"""TradingView UDF datafeed (https://www.tradingview.com/charting-library-docs/latest/connecting_data/UDF)."""
from collections.abc import AsyncIterator
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query

from nepse.application.charting.get_history import INTRADAY, get_history, get_intraday_history
from nepse.application.charting.ports import SymbolInfo
from nepse.infrastructure.db.repositories.charting import SqlChartRepository
from nepse.infrastructure.db.session import SessionLocal

router = APIRouter(prefix="/api/v1/udf", tags=["udf"])

RESOLUTIONS = [*INTRADAY, "1D"]


async def chart_repo() -> AsyncIterator[SqlChartRepository]:
    async with SessionLocal() as s:
        yield SqlChartRepository(s)


def _search_item(s: SymbolInfo) -> dict:
    return {"symbol": s.symbol, "full_name": s.symbol, "description": s.name, "exchange": "NEPSE",
            "ticker": s.symbol, "type": "stock"}


@router.get("/config")
async def config() -> dict:
    return {
        "supported_resolutions": RESOLUTIONS,
        "supports_search": True,
        "supports_group_request": False,
        "supports_marks": False,
        "supports_timescale_marks": False,
        "supports_time": False,
        "exchanges": [{"value": "NEPSE", "name": "NEPSE", "desc": "Nepal Stock Exchange"}],
        "symbols_types": [{"name": "Stock", "value": "stock"}],
    }


@router.get("/symbols")
async def symbols(symbol: str, repo: SqlChartRepository = Depends(chart_repo)) -> dict:
    info = await repo.find_symbol(symbol.split(":")[-1].upper())
    if info is None:
        raise HTTPException(404, f"unknown symbol {symbol}")
    return {
        "name": info.symbol, "ticker": info.symbol, "description": info.name, "type": "stock",
        "exchange": "NEPSE", "listed_exchange": "NEPSE", "sector": info.sector,
        "session": "1100-1500:12345",  # Sun..Thu in TradingView's 1=Sunday numbering
        "timezone": "Asia/Kathmandu", "minmov": 1, "pricescale": 100, "volume_precision": 0,
        "has_intraday": True, "intraday_multipliers": list(INTRADAY), "has_daily": True,
        "supported_resolutions": RESOLUTIONS, "data_status": "endofday",
    }


@router.get("/search")
async def search(
    query: str = "", limit: int = Query(30, ge=1, le=100), repo: SqlChartRepository = Depends(chart_repo)
) -> list[dict]:
    return [_search_item(s) for s in await repo.search_symbols(query.strip(), limit)]


@router.get("/history")
async def history(
    symbol: str,
    from_: int = Query(alias="from"),
    to: int = Query(),
    resolution: str = "1D",
    adjusted: bool = True,
    repo: SqlChartRepository = Depends(chart_repo),
) -> dict:
    res = resolution.upper()
    symbol = symbol.split(":")[-1].upper()
    if res in INTRADAY:
        return await get_intraday_history(
            repo, symbol, datetime.fromtimestamp(from_, UTC), datetime.fromtimestamp(to, UTC), res
        )
    if res not in ("1D", "D"):
        return {"s": "error", "errmsg": f"unsupported resolution {resolution}"}
    start, end = (datetime.fromtimestamp(t, UTC).date() for t in (from_, to))
    return await get_history(repo, symbol, start, end, adjusted)
