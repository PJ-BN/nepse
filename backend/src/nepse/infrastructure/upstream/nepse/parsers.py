"""Pure mappers from nepalstock.com.np JSON to domain entities (tested against saved fixtures)."""
from datetime import datetime
from decimal import Decimal

from nepse.application.ingestion.ports import MarketOpen
from nepse.domain.calendar.npt import NPT
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


def npt(ts: str) -> datetime:
    """NEPSE timestamps are naive NPT, either '2026-10-16 15:00:00.000876' or '2026-10-16T10:46:00.018539'."""
    return datetime.fromisoformat(ts.replace(" ", "T")).replace(tzinfo=NPT)


def _dec(value) -> Decimal | None:
    return None if value is None else Decimal(str(value))


def market_open(data: dict) -> MarketOpen:
    return MarketOpen(is_open=data["isOpen"] == "OPEN", as_of=npt(data["asOf"]), market_id=int(data["id"]))


def live_quotes(rows: list[dict]) -> list[Quote]:
    quotes = []
    for r in rows:
        ltp, prev = float(r["lastTradedPrice"]), float(r["previousClose"])
        quotes.append(Quote(
            symbol=r["symbol"], ltp=ltp, open=float(r["openPrice"]), high=float(r["highPrice"]),
            low=float(r["lowPrice"]), prev_close=prev, change=round(ltp - prev, 2),
            pct_change=float(r["percentageChange"]), volume=int(r["totalTradeQuantity"]),
            turnover=float(r["totalTradeValue"]), ts=npt(r["lastUpdatedDateTime"]),
        ))
    return quotes


def index_ticks(rows: list[dict], ts: datetime) -> list[IndexTick]:
    """Works for both nots/nepse-index (4 headline indices) and nots (13 sub-indices)."""
    return [
        IndexTick(code=INDEX_IDS[r["id"]], value=float(r["currentValue"]), change=float(r["change"]),
                  pct_change=float(r["perChange"]), turnover=None, ts=ts)
        for r in rows if r["id"] in INDEX_IDS
    ]


def today_prices(rows: list[dict]) -> list[DailyBar]:
    return [
        DailyBar(
            symbol=r["symbol"], trade_date=datetime.fromisoformat(r["businessDate"]).date(),
            open=_dec(r["openPrice"]), high=_dec(r["highPrice"]), low=_dec(r["lowPrice"]),
            close=_dec(r["closePrice"]), prev_close=_dec(r["previousDayClosePrice"]),
            volume=int(r["totalTradedQuantity"]), turnover=_dec(r["totalTradedValue"]),
            transactions=r.get("totalTrades"),
        )
        for r in rows
    ]


def index_bar(index_id: int, row: dict) -> IndexBar:
    return IndexBar(
        code=INDEX_IDS[index_id], trade_date=datetime.fromisoformat(row["businessDate"]).date(),
        open=_dec(row["openIndex"]), high=_dec(row["highIndex"]), low=_dec(row["lowIndex"]),
        close=_dec(row["closingIndex"]), turnover=_dec(row.get("turnoverValue")),
    )


def floorsheet_page(data: dict) -> tuple[list[FloorsheetTick], int]:
    """(ticks, total_pages) from a nots/nepse-data/floorsheet response."""
    page = data["floorsheets"]
    ticks = [
        FloorsheetTick(
            contract_no=int(r["contractId"]), symbol=r["stockSymbol"],
            buyer_broker=int(r["buyerMemberId"]), seller_broker=int(r["sellerMemberId"]),
            qty=int(r["contractQuantity"]), rate=_dec(r["contractRate"]), amount=_dec(r["contractAmount"]),
            trade_time=npt(r["tradeTime"]), buyer_name=r.get("buyerBrokerName"), seller_name=r.get("sellerBrokerName"),
        )
        for r in page["content"]
    ]
    return ticks, int(page["totalPages"])


def listed_companies(companies: list[dict], securities: list[dict]) -> list[ListedCompany]:
    """Join nots/company/list (sector, type, status) with nots/security (security id) on symbol."""
    security_ids = {s["symbol"]: int(s["id"]) for s in securities}
    sector_by_name = {_base_name(c.get("securityName") or c["companyName"]): SECTOR_CODES.get(c.get("sectorName"))
                      for c in companies}
    out = []
    for c in companies:
        instrument = INSTRUMENT_TYPES.get(c.get("instrumentType"))
        if c["status"] == "D" or instrument is None:
            continue
        sector = "MUTUAL" if instrument == "MUTUAL_FUND" else SECTOR_CODES.get(c.get("sectorName"))
        out.append(ListedCompany(
            symbol=c["symbol"], name=c.get("securityName") or c["companyName"], sector_code=sector,
            instrument_type=instrument, status=c["status"], nepse_id=security_ids.get(c["symbol"]),
        ))
    # Promoter shares trade (and show up in floorsheets) but are absent from company/list; the security list
    # names them "<Company> Promoter Share", which also gives the parent's sector.
    listed = {c.symbol for c in out}
    for s in securities:
        if s["symbol"] not in listed and "promoter" in s["securityName"].lower():
            out.append(ListedCompany(
                symbol=s["symbol"], name=s["securityName"], sector_code=sector_by_name.get(_base_name(s["securityName"])),
                instrument_type="PROMOTER", status=s.get("activeStatus") or "A", nepse_id=int(s["id"]),
            ))
    return out


def _base_name(name: str) -> str:
    """'Asian Life Insurance Co. Ltd Promoter Share' -> 'asian life insurance co. ltd' (for parent lookup)."""
    name = name.lower()
    return name[: name.index("promoter")].strip() if "promoter" in name else name.strip()
