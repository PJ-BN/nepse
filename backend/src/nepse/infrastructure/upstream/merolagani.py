"""MeroLagani CompanyDetail.aspx scraper (ASP.NET WebForms).

The summary table (EPS, P/E, book value, 52-week range) is in the first GET. Tabs such as Dividend only render
after a postback that echoes the page's hidden __VIEWSTATE/__EVENTVALIDATION fields plus the tab's submit button.
MeroLagani does not publish the promoter/public split; that comes from NepaliPaisa's ownership endpoint.
"""
import asyncio
import re
import time

import httpx
from selectolax.lexbor import LexborHTMLParser

from nepse.application.fundamentals.ports import DividendRecord, FinancialSnapshot, UpstreamError
from nepse.domain.fundamentals.fiscal_year import normalize_fy
from nepse.domain.fundamentals.sector_metrics import sector_code_from_name

URL = "https://merolagani.com/CompanyDetail.aspx"
_CTRL = "ctl00$ContentPlaceHolder1$CompanyDetail1$"
_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; nepse-analytics)"}
MIN_INTERVAL_S = 2.0  # politeness: at most one request every 2 s per process

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


def _rows(tree: LexborHTMLParser, selector: str) -> dict[str, str]:
    out = {}
    for tr in tree.css(selector):
        th, td = tr.css_first("th"), tr.css_first("td")
        if th and td:
            out[th.text(strip=True)] = td.text(separator=" ", strip=True)
    return out


def parse_company_detail(html: str, symbol: str) -> FinancialSnapshot:
    tree = LexborHTMLParser(html)
    summary = _rows(tree, "#accordion > tbody > tr")
    about = _rows(tree, "#divAbout tr")
    eps_text = summary.get("EPS", "")
    fy, q = re.search(r"FY:\s*([\d-]+)", eps_text), re.search(r"Q:\s*(\d)", eps_text)
    if not fy or not q or not 1 <= int(q.group(1)) <= 4:
        raise UpstreamError(f"merolagani {symbol}: no quarterly EPS in {eps_text!r}")
    high = low = None
    if hl := summary.get("52 Weeks High - Low"):
        high, low = (_num(x) for x in hl.split("-", 1))
    price = tree.css_first("#ctl00_ContentPlaceHolder1_CompanyDetail1_lblMarketPrice")
    return FinancialSnapshot(
        symbol=symbol,
        name=about.get("Company Name"),
        sector_code=sector_code_from_name(about.get("Sector") or summary.get("Sector")),
        fy_bs=normalize_fy(fy.group(1)),
        quarter=int(q.group(1)),
        eps=_num(eps_text),
        bvps=_num(summary.get("Book Value")),
        paid_up_capital=_num(about.get("Total Paidup Value")),
        listed_shares=_num(about.get("Listed Shares") or summary.get("Shares Outstanding")),
        pe=_num(summary.get("P/E Ratio")),
        market_price=_num(price.text() if price else None),
        high_52w=high,
        low_52w=low,
    )


def parse_dividend_tab(html: str) -> list[DividendRecord]:
    tree = LexborHTMLParser(html)
    out = []
    for table in tree.css("#divDividend table"):
        if "Cash Dividend" not in (table.css_first("tr").text() if table.css_first("tr") else ""):
            continue
        for tr in table.css("tr")[1:]:
            cells = [td.text(strip=True) for td in tr.css("td")]
            if len(cells) < 5 or not cells[1]:
                continue
            out.append(DividendRecord(fy_bs=normalize_fy(cells[1]), cash_pct=_num(cells[2]) or 0.0,
                                      bonus_pct=_num(cells[3]) or 0.0, right_ratio=cells[4] or None))
        break
    return out


def hidden_fields(html: str) -> dict[str, str]:
    """Every hidden input of the WebForms form; ASP.NET rejects a postback without __VIEWSTATE/__EVENTVALIDATION."""
    tree = LexborHTMLParser(html)
    fields = {n.attributes.get("name"): n.attributes.get("value") or ""
              for n in tree.css("form#aspnetForm input[type=hidden]")}
    fields.pop(None, None)
    if "__VIEWSTATE" not in fields:
        raise UpstreamError("merolagani: page has no __VIEWSTATE")
    return fields


class MeroLaganiClient:
    async def _fetch(self, client: httpx.AsyncClient, method: str, symbol: str, data: dict | None = None) -> str:
        await _polite()
        try:
            r = await client.request(method, URL, params={"symbol": symbol}, data=data)
            r.raise_for_status()
        except httpx.HTTPError as exc:
            raise UpstreamError(f"merolagani {symbol}: {exc}") from exc
        return r.text

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(headers=_HEADERS, timeout=30, follow_redirects=True)

    async def financial_snapshot(self, symbol: str) -> FinancialSnapshot:
        async with self._client() as c:
            return parse_company_detail(await self._fetch(c, "GET", symbol), symbol)

    async def dividends(self, symbol: str) -> list[DividendRecord]:
        async with self._client() as c:  # same client keeps the ASP.NET session cookie between GET and POST
            form = hidden_fields(await self._fetch(c, "GET", symbol))
            form[_CTRL + "btnDividendTab"] = ""
            return parse_dividend_tab(await self._fetch(c, "POST", symbol, data=form))
