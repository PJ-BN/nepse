"""Pure mappers from nepalstock.com.np JSON to domain entities (tested against saved fixtures)."""
from datetime import datetime
from decimal import Decimal

from nepse.application.ingestion.ports import MarketOpen
from nepse.domain.calendar.npt import NPT
from nepse.domain.market.depth import DepthLevel, MarketDepth
from nepse.domain.market.entities import DailyBar, FloorsheetTick, IndexBar, IndexTick, ListedCompany, Quote

# NEPSE exchange index id -> our index code (ids from GET nots/index)
INDEX_IDS = {
    58: "NEPSE", 57: "SENSITIVE", 62: "FLOAT", 63: "SENSFLOAT",
    51: "BANKING", 55: "DEVBANK", 60: "FINANCE", 64: "MICROFIN", 65: "LIFEINSU", 59: "NONLIFE",
    54: "HYDRO", 56: "MANUFAC", 52: "HOTEL", 61: "TRADING", 67: "INVEST", 53: "OTHERS", 66: "MUTUAL",
}

# nots/company/list sectorName -> our sector code
SECTOR_CODES = {
    "Commercial Banks": "BANKING", "Development Banks": "DEVBANK", "Finance": "FINANCE",
    "Microfinance": "MICROFIN", "Life Insurance": "LIFEINSU", "Non Life Insurance": "NONLIFE",
    "Hydro Power": "HYDRO", "Manufacturing And Processing": "MANUFAC", "Hotels And Tourism": "HOTEL",
    "Tradings": "TRADING", "Investment": "INVEST", "Others": "OTHERS", "Mutual Fund": "MUTUAL",
}

# Preference shares are skipped: no index tracks them and the instrument_type enum has no slot for them.
INSTRUMENT_TYPES = {"Equity": "EQUITY", "Mutual Funds": "MUTUAL_FUND", "Non-Convertible Debentures": "DEBENTURE"}

# NEPSE activeStatus code -> companies.status (the schema default and every reader use the long form)
STATUSES = {"A": "ACTIVE", "S": "SUSPENDED"}


def npt(ts: str) -> datetime:
    """NEPSE timestamps are naive NPT, either '2026-10-16 15:00:00.000876' or '2026-10-16T10:46:00.018539'."""
    return datetime.fromisoformat(ts.replace(" ", "T")).replace(tzinfo=NPT)


def _dec(value) -> Decimal | None:
    return None if value is None else Decimal(str(value))


def market_open(data: dict) -> MarketOpen:
    return MarketOpen(is_open=data.get("isOpen") == "OPEN", as_of=npt(data["asOf"]), market_id=int(data.get("id") or 0))


def live_quotes(rows: list[dict]) -> list[Quote]:
    quotes = []
    for r in rows:
        ltp = float(r.get("lastTradedPrice") or 0.0)
        prev = float(r.get("previousClose") or 0.0)
        quotes.append(Quote(
            symbol=r["symbol"], ltp=ltp, open=float(r.get("openPrice") or 0.0), high=float(r.get("highPrice") or 0.0),
            low=float(r.get("lowPrice") or 0.0), prev_close=prev, change=round(ltp - prev, 2),
            pct_change=float(r.get("percentageChange") or 0.0), volume=int(r.get("totalTradeQuantity") or 0),
            turnover=float(r.get("totalTradeValue") or 0.0), ts=npt(r["lastUpdatedDateTime"]),
        ))
    return quotes


def index_ticks(rows: list[dict], ts: datetime) -> list[IndexTick]:
    """Works for both nots/nepse-index (4 headline indices) and nots (13 sub-indices)."""
    return [
        IndexTick(code=INDEX_IDS[r["id"]], value=float(r.get("currentValue") or 0.0), change=float(r.get("change") or 0.0),
                  pct_change=float(r.get("perChange") or 0.0), turnover=None, ts=ts)
        for r in rows if r.get("id") in INDEX_IDS
    ]


def today_prices(rows: list[dict]) -> list[DailyBar]:
    return [
        DailyBar(
            symbol=r["symbol"], trade_date=datetime.fromisoformat(r["businessDate"]).date(),
            open=_dec(r.get("openPrice")), high=_dec(r.get("highPrice")), low=_dec(r.get("lowPrice")),
            close=_dec(r.get("closePrice")), prev_close=_dec(r.get("previousDayClosePrice")),
            volume=int(r.get("totalTradedQuantity") or 0), turnover=_dec(r.get("totalTradedValue")),
            transactions=int(r["totalTrades"]) if r.get("totalTrades") is not None else None,
        )
        for r in rows
    ]


def index_bar(index_id: int, row: dict) -> IndexBar:
    return IndexBar(
        code=INDEX_IDS[index_id], trade_date=datetime.fromisoformat(row["businessDate"]).date(),
        open=_dec(row.get("openIndex")), high=_dec(row.get("highIndex")), low=_dec(row.get("lowIndex")),
        close=_dec(row.get("closingIndex")), turnover=_dec(row.get("turnoverValue")),
    )


def floorsheet_page(data: dict) -> tuple[list[FloorsheetTick], int]:
    """(ticks, total_pages) from a nots/nepse-data/floorsheet response."""
    page = data.get("floorsheets") or {}
    content = page.get("content") or []
    ticks = [
        FloorsheetTick(
            contract_no=int(r["contractId"]), symbol=r["stockSymbol"],
            buyer_broker=int(r["buyerMemberId"]) if r.get("buyerMemberId") is not None else 0,
            seller_broker=int(r["sellerMemberId"]) if r.get("sellerMemberId") is not None else 0,
            qty=int(r.get("contractQuantity") or 0),
            rate=_dec(r.get("contractRate")) or Decimal(0),
            amount=_dec(r.get("contractAmount")) or Decimal(0),
            trade_time=npt(r["tradeTime"]), buyer_name=r.get("buyerBrokerName"), seller_name=r.get("sellerBrokerName"),
        )
        for r in content
    ]
    return ticks, int(page.get("totalPages") or 0)


def listed_companies(companies: list[dict], securities: list[dict]) -> list[ListedCompany]:
    """Join nots/company/list (sector, type, status) with nots/security (security id) on symbol."""
    security_ids = {s["symbol"]: int(s["id"]) for s in securities if s.get("id") is not None and s.get("symbol")}
    sector_by_name = {_base_name(c.get("securityName") or c.get("companyName") or ""): SECTOR_CODES.get(c.get("sectorName"))
                      for c in companies}
    out = []
    for c in companies:
        instrument = INSTRUMENT_TYPES.get(c.get("instrumentType"))
        if c.get("status") == "D" or instrument is None:
            continue
        sector = "MUTUAL" if instrument == "MUTUAL_FUND" else SECTOR_CODES.get(c.get("sectorName"))
        out.append(ListedCompany(
            symbol=c["symbol"], name=c.get("securityName") or c.get("companyName") or c["symbol"], sector_code=sector,
            instrument_type=instrument, status=STATUSES.get(c.get("status"), c.get("status", "ACTIVE")), nepse_id=security_ids.get(c["symbol"]),
        ))
    # Promoter shares trade (and show up in floorsheets) but are absent from company/list; the security list
    # names them "<Company> Promoter Share", which also gives the parent's sector.
    listed = {c.symbol for c in out}
    for s in securities:
        sec_name = s.get("securityName") or ""
        if s.get("symbol") and s["symbol"] not in listed and "promoter" in sec_name.lower():
            nepse_id = int(s["id"]) if s.get("id") is not None else None
            out.append(ListedCompany(
                symbol=s["symbol"], name=sec_name, sector_code=sector_by_name.get(_base_name(sec_name)),
                instrument_type="PROMOTER", status=STATUSES.get(s.get("activeStatus") or "A", "ACTIVE"), nepse_id=nepse_id,
            ))
    return out


def _base_name(name: str) -> str:
    """'Asian Life Insurance Co. Ltd Promoter Share' -> 'asian life insurance co. ltd' (for parent lookup)."""
    name = name.lower()
    return name[: name.index("promoter")].strip() if "promoter" in name else name.strip()


DEPTH_LEVELS = 5


def market_depth(symbol: str, data: dict, ts: datetime) -> MarketDepth:
    """nots/nepse-data/marketdepth/{id}: the book arrives best-first; keep the top 5 per side."""
    book = data.get("marketDepth") or {}

    def levels(rows: list[dict] | None) -> tuple[DepthLevel, ...]:
        return tuple(DepthLevel(float(r.get("orderBookOrderPrice") or 0.0), int(r.get("quantity") or 0), int(r.get("orderCount") or 0))
                     for r in (rows or [])[:DEPTH_LEVELS])

    return MarketDepth(symbol, levels(book.get("buyMarketDepthList")), levels(book.get("sellMarketDepthList")),
                       int(data.get("totalBuyQty") or 0), int(data.get("totalSellQty") or 0), ts)
