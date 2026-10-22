import json
from datetime import date
from decimal import Decimal
from pathlib import Path

from nepse.domain.calendar.npt import NPT
from nepse.infrastructure.upstream.nepse import parsers

FIXTURES = Path(__file__).parent / "fixtures" / "nepse"


def load(name: str):
    return json.loads((FIXTURES / f"{name}.json").read_text())


def test_market_open():
    m = parsers.market_open(load("market_open"))
    assert (m.is_open, m.market_id, m.as_of.date()) == (False, 80, date(2026, 10, 16))
    assert m.as_of.tzinfo is NPT


def test_live_quotes():
    q = parsers.live_quotes(load("lives_market"))[0]
    assert q.symbol and q.ltp > 0 and q.ts.tzinfo is NPT
    assert q.change == round(q.ltp - q.prev_close, 2)


def test_all_17_indices_map_to_codes():
    ts = parsers.npt("2026-10-16 15:00:00")
    ticks = parsers.index_ticks(load("nepse_index"), ts) + parsers.index_ticks(load("sub_indices"), ts)
    assert {t.code for t in ticks} == set(parsers.INDEX_IDS.values())
    assert len(ticks) == 17


def test_today_prices():
    bars = parsers.today_prices(load("today_price")["content"])
    assert bars and all(b.trade_date == date(2026, 10, 16) for b in bars)
    assert isinstance(bars[0].close, Decimal)


def test_index_bar():
    bar = parsers.index_bar(51, load("index_history")["content"][0])
    assert (bar.code, bar.close) == ("BANKING", Decimal("1574.47"))


def test_floorsheet_page():
    ticks, pages = parsers.floorsheet_page(load("floorsheet"))
    t = ticks[0]
    assert pages > 1 and t.qty > 0 and abs(t.amount - t.rate * t.qty) < 1
    assert t.trade_time.tzinfo is NPT and t.buyer_name


def test_listed_companies_skips_delisted_and_maps_sectors():
    companies = parsers.listed_companies(load("company_list"), load("security_list"))
    by_symbol = {c.symbol: c for c in companies}
    assert by_symbol["NABIL"].sector_code == "BANKING" and by_symbol["NABIL"].nepse_id == 131
    assert {c.status for c in companies} <= {"ACTIVE", "SUSPENDED"}


def test_promoter_shares_inherit_parent_sector():
    companies = [{"symbol": "ALICL", "companyName": "Asian Life Insurance Co. Ltd", "securityName": "Asian Life Insurance Co. Ltd",
                  "sectorName": "Life Insurance", "instrumentType": "Equity", "status": "A"}]
    securities = [{"id": 1, "symbol": "ALICL", "securityName": "Asian Life Insurance Co. Ltd", "activeStatus": "A"},
                  {"id": 2, "symbol": "ALICLP", "securityName": "Asian Life Insurance Co. Ltd Promoter Share", "activeStatus": "A"}]
    promoter = {c.symbol: c for c in parsers.listed_companies(companies, securities)}["ALICLP"]
    assert (promoter.instrument_type, promoter.sector_code, promoter.nepse_id) == ("PROMOTER", "LIFEINSU", 2)


def test_market_depth_keeps_top_five_per_side():
    d = parsers.market_depth("NABIL", load("market_depth"), parsers.npt("2026-10-16 11:30:00"))
    assert len(d.buy) == 5 and len(d.sell) == 2
    assert (d.buy[0].price, d.buy[0].qty, d.buy[0].orders) == (510.0, 1000, 3)
    assert (d.total_buy_qty, d.total_sell_qty) == (5200, 4100)
