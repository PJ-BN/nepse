"""nepalstock.com.np adapter implementing application.ingestion.ports.MarketDataSource."""
import asyncio
import json
from collections.abc import AsyncIterator
from datetime import date

import httpx
from redis.asyncio import Redis

from nepse.application.ingestion.ports import MarketOpen
from nepse.domain.calendar.npt import now_npt
from nepse.domain.market.depth import MarketDepth
from nepse.domain.market.entities import DailyBar, FloorsheetTick, IndexBar, IndexTick, ListedCompany, Quote
from nepse.infrastructure.upstream.nepse import parsers
from nepse.infrastructure.upstream.nepse.payload_id import PayloadKind, payload_id
from nepse.infrastructure.upstream.nepse.wasm_token import TokenSolver, salts_of

BASE_URL = "https://nepalstock.com.np/api/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/130.0 Safari/537.36",
    "Referer": "https://nepalstock.com.np/",
    "Origin": "https://nepalstock.com.np",
}
TOKEN_KEY, TOKEN_LOCK, TOKEN_TTL = "nepse:auth:token", "nepse:auth:lock", 45
PAGE_SIZE = 500
PAGE_DELAY = 0.5  # seconds between paginated requests; be polite to the exchange


def new_http_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(base_url=BASE_URL, headers=HEADERS, timeout=30)


class NepseClient:
    def __init__(self, http: httpx.AsyncClient, redis: Redis, solver: TokenSolver) -> None:
        self._http, self._redis, self._solver = http, redis, solver

    # --- auth -------------------------------------------------------------------------------------------
    async def _auth(self, force: bool = False) -> tuple[str, list[int]]:
        """(access_token, salts), shared across workers via Redis for 45s; one worker refreshes at a time."""
        if not force and (cached := await self._redis.get(TOKEN_KEY)):
            data = json.loads(cached)
            return data["token"], data["salts"]
        async with self._redis.lock(TOKEN_LOCK, timeout=20, blocking_timeout=20):
            if not force and (cached := await self._redis.get(TOKEN_KEY)):
                data = json.loads(cached)
                return data["token"], data["salts"]
            res = await self._http.get("authenticate/prove")
            res.raise_for_status()
            prove = res.json()
            token, _ = self._solver.solve(prove)
            salts = salts_of(prove)
            await self._redis.set(TOKEN_KEY, json.dumps({"token": token, "salts": salts}), ex=TOKEN_TTL)
            return token, salts

    async def _call(self, method: str, path: str, kind: PayloadKind | None = None, market_id: int = 0, **params):
        for attempt in range(2):
            token, salts = await self._auth(force=attempt > 0)
            headers = {"Authorization": f"Salter {token}"}
            if kind is None:
                res = await self._http.request(method, path, params=params or None, headers=headers)
            else:
                body = {"id": payload_id(kind, market_id, salts, now_npt().day)}
                res = await self._http.post(path, params=params or None, json=body, headers=headers)
            if res.status_code != 401:
                res.raise_for_status()
                return res.json()
        res.raise_for_status()

    async def _get(self, path: str, **params):
        return await self._call("GET", path, **params)

    # --- MarketDataSource ---------------------------------------------------------------------------------
    async def market_open(self) -> MarketOpen:
        return parsers.market_open(await self._get("nots/nepse-data/market-open"))

    async def live_quotes(self) -> list[Quote]:
        return parsers.live_quotes(await self._get("nots/lives-market"))

    async def live_indices(self) -> list[IndexTick]:
        ts = now_npt()
        main, sub = await self._get("nots/nepse-index"), await self._get("nots")
        return parsers.index_ticks(main, ts) + parsers.index_ticks(sub, ts)

    async def market_depth(self, symbol: str, nepse_id: int) -> MarketDepth:
        return parsers.market_depth(symbol, await self._get(f"nots/nepse-data/marketdepth/{nepse_id}"), now_npt())

    async def listed_companies(self) -> list[ListedCompany]:
        companies = await self._get("nots/company/list")
        securities = await self._get("nots/security", nonDelisted="true")
        return parsers.listed_companies(companies, securities)

    async def today_prices(self) -> list[DailyBar]:
        bars, page, pages = [], 0, 1
        market_id = (await self.market_open()).market_id
        while page < pages:
            data = await self._call("POST", "nots/nepse-data/today-price", PayloadKind.TODAY_PRICE, market_id,
                                    size=PAGE_SIZE, page=page)
            bars += parsers.today_prices(data["content"])
            pages, page = int(data["totalPages"]), page + 1
            await asyncio.sleep(PAGE_DELAY)
        return bars

    async def index_bars(self) -> list[IndexBar]:
        bars = []
        for index_id in parsers.INDEX_IDS:
            data = await self._get(f"nots/index/history/{index_id}", size=1)
            if data["content"]:
                bars.append(parsers.index_bar(index_id, data["content"][0]))
        return bars

    def floorsheet(self) -> AsyncIterator[list[FloorsheetTick]]:
        return self._floorsheet()

    def floorsheet_on(self, day: date) -> AsyncIterator[list[FloorsheetTick]]:
        return self._floorsheet(businessDate=day.isoformat())

    async def _floorsheet(self, **params) -> AsyncIterator[list[FloorsheetTick]]:
        page, pages = 0, 1
        market_id = (await self.market_open()).market_id
        while page < pages:
            data = await self._call("POST", "nots/nepse-data/floorsheet", PayloadKind.FLOORSHEET, market_id,
                                    size=PAGE_SIZE, page=page, sort="contractId,asc", **params)
            ticks, pages = parsers.floorsheet_page(data)
            yield ticks
            page += 1
            await asyncio.sleep(PAGE_DELAY)

    async def latest_trades(self) -> list[FloorsheetTick]:
        market_id = (await self.market_open()).market_id
        data = await self._call("POST", "nots/nepse-data/floorsheet", PayloadKind.FLOORSHEET, market_id,
                                size=PAGE_SIZE, page=0, sort="contractId,desc")
        return parsers.floorsheet_page(data)[0]
