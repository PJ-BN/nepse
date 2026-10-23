"""ShareSansar quarterly reports: the company page's "Quarterly Report" tab is HTML tables (no PDF, no login).

Only the BFI key-metrics table is read (banks, development banks, finance, microfinance share one layout).
Hydropower and insurance tables carry none of the sector inputs the valuation rules need, so they yield None.
"""
import asyncio
import re

import httpx
from selectolax.lexbor import LexborHTMLParser

from nepse.application.fundamentals.ports import SectorReport, UpstreamError
from nepse.infrastructure.upstream.sharesansar import REQUEST_DELAY, page_tokens

_SECTOR = re.compile(r'id="sector" style="display: none;">([^<]*)<')
_PERIOD = re.compile(r"(\d)\w\w Quarter (\d{4})/\d{2}(\d{2})")
_BFI = {  # key-metrics row label (lower-cased) -> BFIMetrics key
    "capital fund to rwa": "car_pct",
    "non-performing loan(npl) to total loan": "npl_pct",
    "cost of funds": "cost_of_funds_pct",
    "credit to deposit ratio": "cd_ratio_pct",
    "base rate": "base_rate_pct",
    "interest spread rate": "interest_spread_pct",
}


def parse_bfi_report(html: str) -> SectorReport | None:
    """Latest quarter's BFI ratios, or None when the report has no key-metrics table in the BFI layout."""
    tab = LexborHTMLParser(html).css_first("#keymetrics")
    if tab is None:
        return None
    head = tab.css_first("th:nth-child(2)")
    period = _PERIOD.search(head.text() if head else "")
    metrics = {}
    for tr in tab.css("tbody tr"):
        cells = [td.text(strip=True) for td in tr.css("td")]
        key = _BFI.get(cells[0].lower()) if len(cells) > 1 else None
        if key:
            metrics[key] = float(cells[1].replace(",", ""))
    if not period or not metrics:
        return None
    return SectorReport(fy_bs=f"{period[2]}/{period[3]}", quarter=int(period[1]), metrics=metrics)


class ShareSansarReports:
    def __init__(self, http: httpx.AsyncClient) -> None:
        self._http = http

    async def sector_report(self, symbol: str) -> SectorReport | None:
        try:
            page = await self._http.get(f"company/{symbol.lower()}")
            page.raise_for_status()
            token, company_id = page_tokens(page.text)
            sector = _SECTOR.search(page.text)
            await asyncio.sleep(REQUEST_DELAY)
            res = await self._http.post(
                "company-quarterly-report", headers={"X-CSRF-Token": token, "X-Requested-With": "XMLHttpRequest"},
                data={"company": company_id, "symbol": symbol.upper(), "sector": sector.group(1) if sector else ""})
            res.raise_for_status()
        except (httpx.HTTPError, ValueError) as e:
            raise UpstreamError(f"ShareSansar quarterly report for {symbol}: {e}") from e
        await asyncio.sleep(REQUEST_DELAY)
        return parse_bfi_report(res.text)
