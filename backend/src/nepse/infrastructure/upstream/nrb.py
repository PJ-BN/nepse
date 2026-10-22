"""Nepal Rastra Bank macro data.

- Homepage "Indicators" card (daily): total deposits, total lending, CD ratio, weighted-average interbank rate,
  each for the last two published dates (dd/mm/yyyy).
- CMEFS "Current Macroeconomic and Financial Situation" tables workbook (monthly, .xlsx):
    Table 1  (sheet "1.*")  latest mid-month column: base rate, gross FX reserves (NPR bn, USD mn)
    Table 52 (sheet "52.*") net liquidity injection(+)/absorption(-) this fiscal year, NPR mn; stored negated in
             NPR bn as excess_liquidity (money NRB had to mop up = surplus liquidity in the system).
  The homepage links the newest CMEFS tables post; that URL redirects straight to the workbook.
"""
import asyncio
import io
import re
from datetime import date, datetime

import httpx
import openpyxl
from bs4 import BeautifulSoup

from nepse.application.macro.ports import (
    BASE_RATE, CD_RATIO, DEPOSITS, EXCESS_LIQUIDITY, FX_RESERVES, FX_RESERVES_USD, INTERBANK_RATE, LENDING,
    Observation,
)

HOME_URL = "https://www.nrb.org.np/"
REQUEST_GAP_S = 2.0
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; nepse-analytics/0.1)"}
_CMEFS_LINK = re.compile(r"current-macroeconomic-and-financial-situation-tables", re.I)

# homepage label (exact, case-insensitive) -> indicator
HOME_LABELS = {
    "total deposits": DEPOSITS,
    "total lending": LENDING,
    "cd ratio": CD_RATIO,
    "interbank interest rate lcy - weighted avg.": INTERBANK_RATE,
}
# CMEFS row label prefix -> indicator, scale
TABLE1_LABELS = {
    "gross foreign exchange reserves (rs. in billion)": (FX_RESERVES, 1.0),
    "gross foreign exchange reserves (usd in million)": (FX_RESERVES_USD, 1.0),
    "base rate": (BASE_RATE, 1.0),
}
TABLE52_LABELS = {"c. net liquidity injection": (EXCESS_LIQUIDITY, -0.001)}  # NPR mn injected -> NPR bn absorbed

_MONTHS = {m: i for i, m in enumerate(
    ("jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"), start=1)}


def _num(text: object) -> float | None:
    if isinstance(text, int | float):
        return float(text)
    m = re.search(r"-?[\d,]*\.?\d+", str(text or ""))
    return float(m.group().replace(",", "")) if m else None


def parse_homepage(html: str) -> list[Observation]:
    soup = BeautifulSoup(html, "lxml")
    header = soup.find("th", string=re.compile(r"Last Updated", re.I))
    if header is None:
        return []
    table = header.find_parent("table")
    dates = [datetime.strptime(th.get_text(strip=True), "%d/%m/%Y").date()
             for th in header.find_parent("tr").find_all("th")[1:]]
    out = []
    for tr in table.find_all("tr"):
        tds = tr.find_all("td")
        if not tds:
            continue
        label = tds[0].find("span").get_text(strip=True).lower() if tds[0].find("span") else ""
        indicator = HOME_LABELS.get(label)
        if indicator is None:
            continue
        for d, td in zip(dates, tds[1:]):
            value = _num(td.get_text())
            if value is not None:
                out.append(Observation(indicator, d, value, "nrb_home"))
    return out


def find_cmefs_url(html: str) -> str | None:
    link = BeautifulSoup(html, "lxml").find("a", href=_CMEFS_LINK)
    return link["href"] if link else None


def _mid_month_date(month_label: str, fiscal_year: str) -> date:
    """('Mid-September', '2026/27') -> 2026-09-15. Nepal's fiscal year runs mid-July to mid-July."""
    month = _MONTHS[month_label.lower().removeprefix("mid-").strip()[:3]]
    first = int(fiscal_year[:4])
    return date(first if month >= 8 else first + 1, month, 15)


def _latest_column(ws, labels: dict[str, tuple[str, float]]) -> list[Observation]:
    """Read the newest mid-month column of every block (a 'Mid-<Month>' header row, fiscal years below it)."""
    out: list[Observation] = []
    rows = [list(r) for r in ws.iter_rows(values_only=True)]
    col: int | None = None
    obs_day: date | None = None
    for i, row in enumerate(rows):
        mid = next((c for c in row if isinstance(c, str) and c.strip().lower().startswith("mid-")), None)
        if mid and i + 1 < len(rows):
            years = [(j, c) for j, c in enumerate(rows[i + 1]) if isinstance(c, str) and re.match(r"\d{4}/\d{2}", c)]
            if years:
                col, fy = years[-1]
                obs_day = _mid_month_date(mid.strip(), fy)
            continue
        if col is None or obs_day is None:
            continue
        label = next((c for c in row if isinstance(c, str)), "")
        for prefix, (indicator, scale) in labels.items():
            if label.strip().lower().startswith(prefix) and col < len(row):
                value = _num(row[col])
                if value is not None:
                    out.append(Observation(indicator, obs_day, value * scale, "nrb_cmefs"))
                break
    return out


def parse_cmefs(data: bytes) -> list[Observation]:
    wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    out: list[Observation] = []
    for ws in wb.worksheets:
        if ws.title.startswith("1."):
            out += _latest_column(ws, TABLE1_LABELS)
        elif ws.title.startswith("52."):
            out += _latest_column(ws, TABLE52_LABELS)
    return out


class NrbClient:
    """NrbSource: the homepage, then the CMEFS workbook it links (2-3 requests, REQUEST_GAP_S apart)."""

    def __init__(self, client: httpx.AsyncClient | None = None):
        self.client = client or httpx.AsyncClient(headers=HEADERS, timeout=60, follow_redirects=True)

    async def fetch(self) -> list[Observation]:
        resp = await self.client.get(HOME_URL)
        resp.raise_for_status()
        out = parse_homepage(resp.text)
        url = find_cmefs_url(resp.text)
        if url:
            await asyncio.sleep(REQUEST_GAP_S)
            xlsx = await self.client.get(url)
            xlsx.raise_for_status()
            if xlsx.content[:2] == b"PK":  # the post sometimes renders an HTML page instead of redirecting
                out += parse_cmefs(xlsx.content)
        return out
