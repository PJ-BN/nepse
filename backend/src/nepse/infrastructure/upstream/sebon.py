"""SEBON issue pipeline: IPO / right-share application lists and approvals.

Each list page on sebon.gov.np is an HTML table of PDF links; the newest PDF is the current list.
The application-list PDFs have no ruling lines and wrap names over several lines, so they are parsed from
word positions: column x-ranges come from the header row, and each word joins the row whose serial number
(S.N column) is vertically nearest. The approved-list PDFs have ruled tables and go through extract_tables.
"""
import asyncio
import io
import re
from dataclasses import dataclass

import httpx
import pdfplumber
from bs4 import BeautifulSoup

from nepse.application.macro.ports import IssueRow

BASE = "https://www.sebon.gov.np/"
# (issue_type, stage) -> list page
LIST_PAGES = {
    ("IPO", "PIPELINE"): "ipo-pipeline",
    ("IPO", "APPROVED"): "ipo-approved",
    ("RIGHT", "PIPELINE"): "right-share-pipeline",
}
REQUEST_GAP_S = 2.0
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; nepse-analytics/0.1)"}

_BS_DATE = re.compile(r"\d{4}[/.-]\d{1,2}[/.-]\d{1,2}")
_AS_ON = re.compile(r"As on\s+(\d{4}[/.-]\d{1,2}[/.-]\d{1,2})", re.I)
_COL_MARGIN = 15  # cells are centred, so their words start a little left of the header word
_ROW_REACH = 12   # wrapped lines of a cell sit within this many points of its serial number
_LINE = 3         # numbers and dates are read only from the serial number's own line
_NUMBER = re.compile(r"[\d,.]+")
NUMERIC_COLS = frozenset({"units", "amount", "app_date"})
_FOR_SUFFIX = re.compile(r"\s*\(\s*For\b.*$", re.I)  # "(For General Public along with premium)"


@dataclass(frozen=True)
class ListEntry:
    title: str
    date: str
    pdf_url: str


def parse_list_page(html: str) -> list[ListEntry]:
    """Rows of the Title / Date / English / Nepali table, newest first as published."""
    out = []
    for tr in BeautifulSoup(html, "lxml").select("table.table tbody tr"):
        tds = tr.find_all("td")
        link = tr.find("a", href=re.compile(r"\.pdf$", re.I))
        if len(tds) >= 3 and link:
            out.append(ListEntry(tds[0].get_text(" ", strip=True), tds[1].get_text(strip=True), link["href"]))
    return out


def _num(text: str) -> float | None:
    digits = re.sub(r"[^\d.]", "", text)
    try:
        return float(digits) if digits else None
    except ValueError:
        return None


def _bs_date(text: str) -> str | None:
    m = _BS_DATE.search(text)
    return re.sub(r"[.-]", "/", m.group()) if m else None


def _clean(text: str) -> str | None:
    text = re.sub(r"\s+", " ", text).strip()
    return text or None


def _header_columns(words: list[dict], header_top: float) -> list[tuple[str, float]]:
    """(column, left boundary) sorted by x, from the header words within a few points of header_top."""
    hdr = sorted((w for w in words if abs(w["top"] - header_top) < 8), key=lambda w: w["x0"])
    texts = [w["text"] for w in hdr]
    cols: dict[str, float] = {}
    for i, w in enumerate(hdr):
        t = w["text"]
        if t.startswith("S.N"):
            cols["name"] = w["x1"] + 3 + _COL_MARGIN  # name words start right after the serial column
        elif t == "Ratio":
            cols["ratio"] = w["x0"]
        elif t in ("Type", "Sector") and "name" in cols and "after_name" not in cols:
            cols["after_name"] = w["x0"]
        elif t == "No.":
            cols["units"] = w["x0"]
        elif t == "Amount":
            cols["amount"] = w["x0"]
        elif t == "Issue" and i >= 2 and texts[i - 2] == "Amount":
            cols["manager"] = w["x1"] + 3 + _COL_MARGIN  # managers are wide, centred names: start after "Amount of Issue"
        elif t in ("Date", "Application") and "manager" in cols and w["x0"] > cols["manager"]:
            if "app_date" not in cols:
                cols["app_date"] = w["x0"]
            elif w["x0"] - cols["app_date"] > 30 and "after_app" not in cols:
                cols["after_app"] = w["x0"]
    return sorted(((k, x - _COL_MARGIN) for k, x in cols.items()), key=lambda kv: kv[1])


def _column_of(x0: float, cols: list[tuple[str, float]]) -> str | None:
    found = None
    for name, left in cols:
        if x0 >= left:
            found = name
    return found


def parse_pipeline_pdf(data: bytes, issue_type: str, source_url: str | None = None) -> list[IssueRow]:
    rows: list[IssueRow] = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        as_on = _AS_ON.search(pdf.pages[0].extract_text() or "")
        as_of = _bs_date(as_on.group(1)) if as_on else None
        for page in pdf.pages:
            words = page.extract_words()
            headers = sorted({round(w["top"]) for w in words if w["text"] == "Name"})
            for i, top in enumerate(headers):
                bottom = headers[i + 1] - 1 if i + 1 < len(headers) else page.height
                cols = _header_columns(words, top)
                if not cols or cols[0][0] != "name":
                    continue
                totals = {round(w["top"]) for w in words if w["text"] == "Total"}
                band = [w for w in words if top + 8 < w["top"] < bottom and round(w["top"]) not in totals]
                name_left = cols[0][1]
                anchors = [w for w in band if w["x0"] < name_left and w["text"].isdigit()]
                cells: list[dict[str, list[str]]] = [{} for _ in anchors]
                for w in band:
                    if not anchors or w in anchors:
                        continue
                    k = min(range(len(anchors)), key=lambda j: abs(anchors[j]["top"] - w["top"]))
                    col = _column_of(w["x0"], cols)
                    if col == "manager" and _NUMBER.fullmatch(w["text"]):
                        col = "amount"  # long amounts overhang the manager column's left edge
                    reach = _LINE if col in NUMERIC_COLS else _ROW_REACH
                    if col and abs(anchors[k]["top"] - w["top"]) <= reach:
                        cells[k].setdefault(col, []).append(w["text"])
                for c in cells:
                    company = _clean(_FOR_SUFFIX.sub("", _clean(" ".join(c.get("name", []))) or ""))
                    if not company:
                        continue
                    rows.append(IssueRow(
                        company=company,
                        issue_type=issue_type,
                        stage="PIPELINE",
                        sector=_clean(" ".join(c.get("after_name", []))) if issue_type == "RIGHT" else None,
                        units=_num("".join(c.get("units", []))),
                        amount=_num("".join(c.get("amount", []))),
                        issue_manager=_clean(" ".join(c.get("manager", []))),
                        application_date_bs=_bs_date(" ".join(c.get("app_date", []))),
                        as_of_bs=as_of,
                        source_url=source_url,
                    ))
    return rows


def parse_approved_pdf(data: bytes, issue_type: str, source_url: str | None = None) -> list[IssueRow]:
    """IPO approved list: S.N, Name, Sector, From, To, No. registered, Rate, Amount registered,
    Public issue size, Public issue amount, Public %, Promoter shares, Promoter %, Issue manager, Approval date."""
    rows: list[IssueRow] = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        as_on = _AS_ON.search(pdf.pages[0].extract_text() or "")
        as_of = _bs_date(as_on.group(1)) if as_on else None
        for page in pdf.pages:
            for table in page.extract_tables():
                for r in table:
                    if len(r) < 15 or not (r[0] or "").strip().isdigit():
                        continue
                    rows.append(IssueRow(
                        company=_clean(_FOR_SUFFIX.sub("", _clean(r[1] or "") or "")) or "",
                        issue_type=issue_type,
                        stage="APPROVED",
                        sector=_clean(r[2] or ""),
                        units=_num(r[8] or ""),
                        amount=_num(r[9] or ""),
                        issue_manager=_clean(r[13] or ""),
                        approval_date_bs=_bs_date(r[14] or ""),
                        as_of_bs=as_of,
                        source_url=source_url,
                    ))
    return [r for r in rows if r.company]


class SebonClient:
    """SebonSource: one list page + one PDF per list, REQUEST_GAP_S apart (7 requests per run)."""

    def __init__(self, client: httpx.AsyncClient | None = None):
        self.client = client or httpx.AsyncClient(headers=HEADERS, timeout=60, follow_redirects=True)

    async def _get(self, url: str) -> httpx.Response:
        await asyncio.sleep(REQUEST_GAP_S)
        resp = await self.client.get(url)
        resp.raise_for_status()
        return resp

    async def fetch(self) -> list[IssueRow]:
        out: list[IssueRow] = []
        for (issue_type, stage), page in LIST_PAGES.items():
            entries = parse_list_page((await self._get(BASE + page)).text)
            if not entries:
                continue
            pdf = (await self._get(entries[0].pdf_url)).content
            parse = parse_pipeline_pdf if stage == "PIPELINE" else parse_approved_pdf
            out += parse(pdf, issue_type, entries[0].pdf_url)
        return out
