"""ShareSansar adapter: 15-year daily OHLCV (with open, which NEPSE's history lacks) plus dividend/right history.

Each company page carries a CSRF token and an internal company id; the DataTables endpoints below are POSTed
with both, exactly as the site's own JS does.
"""
import asyncio
import re
from datetime import date
from decimal import Decimal, InvalidOperation

import httpx
from selectolax.lexbor import LexborHTMLParser

from nepse.application.fundamentals.ports import NavRow
from nepse.domain.market.entities import CorporateActionRecord, DailyBar

BASE_URL = "https://www.sharesansar.com/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/130.0 Safari/537.36",
}
PAGE_SIZE = 50  # the endpoints return an EMPTY result (not an error) for length > 50
REQUEST_DELAY = 1.0  # seconds between requests; ShareSansar is a community site, keep the load trivial

_TOKEN = re.compile(r'name="_token" content="([^"]+)"')
_COMPANY_ID = re.compile(r'id="companyid" style="display: none;">(\d+)<')
_RATIO = re.compile(r"([\d.]+)\s*:\s*([\d.]+)")


def _dec(value) -> Decimal:
    try:
        return Decimal(str(value).replace(",", "").strip() or 0)
    except InvalidOperation:
        return Decimal(0)


def _date(value: str | None) -> date | None:
    match = re.search(r"\d{4}-\d{2}-\d{2}", value or "")
    return date.fromisoformat(match.group()) if match else None


# --- pure parsers -------------------------------------------------------------------------------------------
def page_tokens(html: str) -> tuple[str, int]:
    """(csrf_token, company_id) from a /company/{symbol} page."""
    token, company = _TOKEN.search(html), _COMPANY_ID.search(html)
    if not token or not company:
        raise ValueError("ShareSansar company page layout changed: token or company id not found")
    return token.group(1), int(company.group(1))


def price_rows(symbol: str, rows: list[dict]) -> list[DailyBar]:
    return [
        DailyBar(
            symbol=symbol, trade_date=date.fromisoformat(r["published_date"]), open=_dec(r["open"]),
            high=_dec(r["high"]), low=_dec(r["low"]), close=_dec(r["close"]), prev_close=None,
            volume=int(_dec(r["traded_quantity"])), turnover=_dec(r["traded_amount"]), transactions=None,
        )
        for r in rows
    ]


def today_price_rows(html: str) -> list[DailyBar]:
    """The /today-share-price table (latest session; its date is the "As of" heading), columns found by header."""
    as_of = re.search(r"As of\s*:\s*<span[^>]*>(\d{4}-\d{2}-\d{2})", html)
    table = LexborHTMLParser(html).css_first("table#headFixed")
    if not as_of or table is None:
        raise ValueError("ShareSansar today-share-price layout changed: date or table not found")
    day = date.fromisoformat(as_of.group(1))
    head = [th.text(strip=True) for th in table.css("thead th")]
    out = []
    for tr in table.css("tbody tr"):
        cells = dict(zip(head, (td.text(strip=True) for td in tr.css("td")), strict=False))
        if not cells.get("Symbol"):
            continue
        out.append(DailyBar(
            symbol=cells["Symbol"], trade_date=day, open=_dec(cells["Open"]), high=_dec(cells["High"]),
            low=_dec(cells["Low"]), close=_dec(cells["Close"]), prev_close=_dec(cells["Prev. Close"]),
            volume=int(_dec(cells["Vol"])), turnover=_dec(cells["Turnover"]), transactions=int(_dec(cells["Trans."])),
        ))
    return out


def with_prev_close(bars: list[DailyBar]) -> list[DailyBar]:
    """Fill prev_close from the previous trading day's close (bars in any order)."""
    ordered = sorted(bars, key=lambda b: b.trade_date)
    out, prev = [], None
    for bar in ordered:
        out.append(bar if prev is None else DailyBar(**{**_fields(bar), "prev_close": prev}))
        prev = bar.close
    return out


def _fields(bar: DailyBar) -> dict:
    return {name: getattr(bar, name) for name in bar.__slots__}


def dividend_rows(symbol: str, rows: list[dict]) -> list[CorporateActionRecord]:
    out = []
    for r in rows:
        closure = _date(r.get("bookclose_date"))
        if closure is None:  # announced but book closure not fixed yet
            continue
        out.append(CorporateActionRecord(
            symbol=symbol, book_closure_date=closure, fiscal_year_bs=(r.get("year") or None),
            bonus_pct=_dec(r.get("bonus_share")), cash_pct=_dec(r.get("cash_dividend")),
        ))
    return out


def right_rows(symbol: str, rows: list[dict]) -> list[CorporateActionRecord]:
    """Ratio '1: 0.40' means 0.40 new shares per share held = 40% right issue; book closes on final_date."""
    out = []
    for r in rows:
        closure, ratio = _date(r.get("final_date")), _RATIO.search(r.get("ratio_value") or "")
        if closure is None or ratio is None or Decimal(ratio.group(1)) == 0:
            continue
        pct = Decimal(ratio.group(2)) / Decimal(ratio.group(1)) * 100
        out.append(CorporateActionRecord(symbol=symbol, book_closure_date=closure, fiscal_year_bs=None, right_pct=pct))
    return out


def nav_rows(rows: list[dict]) -> list[tuple[str, NavRow]]:
    """Funds with no weekly NAV yet are skipped; the NAV date is the weekly one (monthly is a BS month label)."""
    return [
        (r["symbol"], NavRow(nav_date=nav_date, weekly_nav=float(r["weekly_nav_price"]),
                             monthly_nav=float(r["monthly_nav_price"]) if r.get("monthly_nav_price") else None))
        for r in rows if r.get("weekly_nav_price") and (nav_date := _date(r.get("weekly_date")))
    ]


def merge_actions(actions: list[CorporateActionRecord]) -> list[CorporateActionRecord]:
    """One record per (symbol, book closure date): a bonus and a right closing the same day are one event."""
    merged: dict[tuple[str, date], CorporateActionRecord] = {}
    for a in actions:
        key = (a.symbol, a.book_closure_date)
        if key in merged:
            m = merged[key]
            a = CorporateActionRecord(a.symbol, a.book_closure_date, m.fiscal_year_bs or a.fiscal_year_bs,
                                      m.bonus_pct + a.bonus_pct, m.right_pct + a.right_pct, m.cash_pct + a.cash_pct)
        merged[key] = a
    return sorted(merged.values(), key=lambda a: a.book_closure_date)


# --- client -------------------------------------------------------------------------------------------------
def new_http_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(base_url=BASE_URL, headers=HEADERS, timeout=60, follow_redirects=True)


class ShareSansarClient:
    def __init__(self, http: httpx.AsyncClient) -> None:
        self._http = http

    async def _session(self, symbol: str) -> tuple[str, int]:
        res = await self._http.get(f"company/{symbol.lower()}")
        res.raise_for_status()
        return page_tokens(res.text)

    async def _table(self, path: str, token: str, company_id: int, start: int, length: int) -> dict:
        await asyncio.sleep(REQUEST_DELAY)
        res = await self._http.post(
            path, data={"draw": 1, "start": start, "length": length, "company": company_id},
            headers={"X-CSRF-Token": token, "X-Requested-With": "XMLHttpRequest"},
        )
        res.raise_for_status()
        return res.json()

    async def today_prices(self) -> list[DailyBar]:
        res = await self._http.get("today-share-price")
        res.raise_for_status()
        return today_price_rows(res.text)

    async def mutual_fund_navs(self) -> list[tuple[str, NavRow]]:
        """Closed-end funds' latest weekly/monthly NAV (the DataTables feed behind /mutual-fund-navs)."""
        res = await self._http.get("mutual-fund-navs", params={"draw": 1, "start": 0, "length": PAGE_SIZE, "type": -1},
                                   headers={"X-Requested-With": "XMLHttpRequest"})
        res.raise_for_status()
        return nav_rows(res.json()["data"])

    async def history(self, symbol: str, since: date) -> tuple[list[DailyBar], list[CorporateActionRecord]]:
        """Daily bars from `since` to today (newest first upstream) plus every dividend/right record."""
        token, company_id = await self._session(symbol)
        bars, start = [], 0
        while True:
            data = await self._table("company-price-history", token, company_id, start, PAGE_SIZE)
            page = price_rows(symbol, data["data"])
            bars += [b for b in page if b.trade_date >= since]
            start += PAGE_SIZE
            if not page or page[-1].trade_date < since or start >= int(data["recordsTotal"]):
                break
        dividends = await self._table("company-dividend", token, company_id, 0, PAGE_SIZE)
        rights = await self._table("company-rightshare", token, company_id, 0, PAGE_SIZE)
        actions = dividend_rows(symbol, dividends["data"]) + right_rows(symbol, rights["data"])
        return with_prev_close(bars), merge_actions(actions)
