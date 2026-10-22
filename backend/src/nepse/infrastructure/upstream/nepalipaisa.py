"""NepaliPaisa client.

Real site vs. the Blueprint: there is no JSON "fundamentals" endpoint. The company page renders EPS/BVPS/paid-up
server-side (parsed as HTML); dividends and the promoter/public split are JSON under /api/ (the same calls the
site's company.js makes). NepaliPaisa publishes no mutual-fund NAVs, so mutual_fund_nav has no scraper yet.
"""
import asyncio
import re
import time
from datetime import date

import httpx
from selectolax.lexbor import LexborHTMLParser

from nepse.application.fundamentals.ports import DividendRecord, FinancialSnapshot, Ownership, UpstreamError
from nepse.domain.fundamentals.fiscal_year import normalize_fy
from nepse.domain.fundamentals.sector_metrics import sector_code_from_name

BASE = "https://nepalipaisa.com"
_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; nepse-analytics)", "X-Requested-With": "XMLHttpRequest"}
MIN_INTERVAL_S = 2.0

_lock = asyncio.Lock()
_last = 0.0
_NUM = re.compile(r"-?[\d,]*\.?\d+")


async def _polite() -> None:
    global _last
    async with _lock:
        wait = _last + MIN_INTERVAL_S - time.monotonic()
        if wait > 0:
            await asyncio.sleep(wait)
        _last = time.monotonic()


def _num(text: str | None) -> float | None:
    m = _NUM.search(text or "")
    return float(m.group().replace(",", "")) if m else None


def parse_company_page(html: str, symbol: str) -> FinancialSnapshot:
    tree = LexborHTMLParser(html)
    stats = {}
    for box in tree.css(".margket-sumamry-details .indices"):
        title, value = box.css_first("p.title"), box.css_first("p.value")
        if title and value:
            stats.setdefault(title.text(strip=True), value.text(strip=True))
    eps_text = stats.get("EPS", "")
    m = re.search(r"Q(\d),\s*FY\s*([\d/]+)", eps_text)
    if not m:
        raise UpstreamError(f"nepalipaisa {symbol}: no quarterly EPS in {eps_text!r}")
    low = high = None
    if rng := tree.css_first(".day-range1 em:last-of-type"):
        low, high = (_num(x) for x in rng.text(separator=" ").split()[:2])
    h1 = tree.css_first("h1")
    name = re.sub(r"\s*\([^)]*\)\s*$", "", h1.text(strip=True)) if h1 else None
    sector = next((li.text(strip=True).split(":", 1)[1] for li in tree.css("li")
                   if li.css_first("catg") and li.text(strip=True).startswith("Sector:")), None)
    return FinancialSnapshot(
        symbol=symbol, name=name, sector_code=sector_code_from_name(sector),
        fy_bs=normalize_fy(m.group(2)), quarter=int(m.group(1)),
        eps=_num(eps_text), bvps=_num(stats.get("BVPS")),
        paid_up_capital=_num(stats.get("Paid Up Capital")), listed_shares=_num(stats.get("Share Outstanding")),
        pe=_num(stats.get("P/E Ratio")), high_52w=high, low_52w=low,
    )


def _result(payload: dict, what: str):
    if payload.get("statusCode") != 200:
        raise UpstreamError(f"nepalipaisa {what}: {payload.get('message')}")
    return payload.get("result")


def parse_dividends(payload: dict) -> list[DividendRecord]:
    rows = (_result(payload, "dividends") or {}).get("data") or []
    return [
        DividendRecord(
            fy_bs=normalize_fy(r["fiscalYearBS"]),
            bonus_pct=float(r.get("bonus") or 0), cash_pct=float(r.get("cash") or 0),
            right_ratio=r.get("rightShare") or None,
            book_closure_date=date.fromisoformat(r["bookClosureDateAD"]) if r.get("bookClosureDateAD") else None,
        )
        for r in rows if r.get("fiscalYearBS")
    ]


def parse_ownership(payload: dict) -> Ownership | None:
    r = _result(payload, "ownership")
    if not r:
        return None
    return Ownership(promoter_shares=int(float(r["promoterShareCount"])),
                     public_shares=int(float(r["publicShareCount"])), listed_shares=int(float(r["listedShares"])))


class NepaliPaisaClient:
    async def _get(self, path: str, params: dict | None = None) -> httpx.Response:
        await _polite()
        try:
            async with httpx.AsyncClient(headers=_HEADERS, timeout=30, follow_redirects=True) as c:
                r = await c.get(BASE + path, params=params)
                r.raise_for_status()
                return r
        except httpx.HTTPError as exc:
            raise UpstreamError(f"nepalipaisa {path}: {exc}") from exc

    async def financial_snapshot(self, symbol: str) -> FinancialSnapshot:
        return parse_company_page((await self._get(f"/company/{symbol}")).text, symbol)

    async def dividends(self, symbol: str) -> list[DividendRecord]:
        r = await self._get("/api/GetDividendRights", {"fiscalYearId": 0, "stockSymbol": symbol, "pageNo": 1,
                                                       "itemsPerPage": 100, "pagePerDisplay": 5})
        return parse_dividends(r.json())

    async def ownership(self, symbol: str) -> Ownership | None:
        return parse_ownership((await self._get("/api/GetOwnership", {"stockSymbol": symbol})).json())
