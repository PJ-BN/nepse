from dataclasses import replace
from datetime import date

import pytest
from pydantic import ValidationError

from nepse.application.fundamentals.get_company_full import get_company_full
from nepse.application.fundamentals.ingest import ingest_dividends, ingest_financials
from nepse.application.fundamentals.ports import (
    CompanyRow,
    DividendRecord,
    FinancialSnapshot,
    Ownership,
    PriceInfo,
    QuarterRow,
    UpstreamError,
)

TODAY = date(2026, 10, 22)
SNAP = FinancialSnapshot(symbol="NABIL", name="Nabil Bank Limited", sector_code="BANKING", fy_bs="2082/83", quarter=4,
                         eps=27.01, bvps=240.27, paid_up_capital=28_409_846_850.0, listed_shares=284_098_468.5)


class FakeRepo:
    def __init__(self):
        self.companies: dict[str, CompanyRow] = {}
        self.quarter_rows: dict[int, list[QuarterRow]] = {}
        self.dividend_rows: dict[int, list[DividendRecord]] = {}
        self.price: PriceInfo | None = None

    async def company(self, symbol):
        return self.companies.get(symbol)

    async def create_company(self, symbol, name, sector_code):
        row = CompanyRow(len(self.companies) + 1, symbol, name, sector_code, "EQUITY", None, None, None, None, None, None)
        self.companies[symbol] = row
        return row

    async def update_company_shares(self, company_id, *, listed, promoter, public, paid_up_capital):
        for sym, c in self.companies.items():
            if c.id == company_id:
                self.companies[sym] = replace(c, listed_shares=int(listed), promoter_shares=promoter,
                                              public_shares=public, paid_up_capital=paid_up_capital)

    async def upsert_quarter(self, company_id, row):
        self.quarter_rows.setdefault(company_id, []).insert(0, row)

    async def upsert_dividends(self, company_id, rows):
        self.dividend_rows[company_id] = rows
        return len(rows)

    async def quarters(self, company_id, limit):
        return self.quarter_rows.get(company_id, [])[:limit]

    async def dividends(self, company_id):
        return self.dividend_rows.get(company_id, [])

    async def latest_price(self, company_id):
        return self.price

    async def latest_nav(self, company_id):
        return None


class Source:
    def __init__(self, snap=SNAP, fail=False, dividends=()):
        self.snap, self.fail, self.divs = snap, fail, list(dividends)

    async def financial_snapshot(self, symbol):
        if self.fail:
            raise UpstreamError("down")
        return self.snap

    async def dividends(self, symbol):
        if self.fail:
            raise UpstreamError("down")
        return self.divs

    async def ownership(self, symbol):
        if self.fail:
            raise UpstreamError("down")
        return Ownership(promoter_shares=158_121_099, public_shares=112_448_885, listed_shares=284_098_483)


async def test_ingest_financials_falls_back_creates_company_and_derives_reserves():
    repo = FakeRepo()
    row = await ingest_financials("nabil", repo, [Source(fail=True), Source()], Source(fail=True),
                                  sector_metrics={"npl_pct": 5.0, "car_pct": 12.5})
    assert repo.companies["NABIL"].sector_code == "BANKING"
    assert row.period_end == date(2026, 7, 16)  # last day of Ashadh 2083
    assert row.reserves == pytest.approx(240.27 * 284_098_468.5 - 28_409_846_850.0, abs=0.01)
    assert row.sector_metrics == {"npl_pct": 5.0, "car_pct": 12.5}
    assert repo.companies["NABIL"].promoter_shares is None  # ownership source failed, financials still stored


async def test_ingest_financials_rejects_bad_metrics_and_all_sources_down():
    with pytest.raises(ValidationError):
        await ingest_financials("NABIL", FakeRepo(), [Source()], sector_metrics={"bogus": 1})
    with pytest.raises(UpstreamError):
        await ingest_financials("NABIL", FakeRepo(), [Source(fail=True)])


async def test_ingest_dividends_requires_company():
    repo = FakeRepo()
    with pytest.raises(LookupError):
        await ingest_dividends("NABIL", repo, [Source()])
    await repo.create_company("NABIL", "Nabil", "BANKING")
    assert await ingest_dividends("NABIL", repo, [Source(dividends=[DividendRecord("2082/83", 5, 10.8)])]) == 1


async def test_get_company_full_assembles_page():
    repo = FakeRepo()
    await ingest_financials("NABIL", repo, [Source()], Source(), sector_metrics={"npl_pct": 5.0, "car_pct": 12.5})
    c = repo.companies["NABIL"]
    repo.companies["NABIL"] = replace(c, promoter_lockin_expiry=date(2026, 12, 1))
    repo.price = PriceInfo(close=547.0, trade_date=date(2026, 10, 16), high_52w=581.0, low_52w=485.0)

    class Live:
        async def quote(self, symbol):
            return {"symbol": symbol, "ltp": 550.0, "ts": "2026-10-22T11:00:00+05:45"}

    full = await get_company_full("nabil", repo, TODAY, Live())
    assert full["price"]["ltp"] == 550.0 and full["price"]["source"] == "live" and full["price"]["high_52w"] == 581.0
    val = full["valuation"]
    assert val["pe"] == pytest.approx(550 / 27.01, abs=0.01)
    assert val["market_cap"] == pytest.approx(550 * 284_098_483, rel=1e-6)
    assert val["graham_number"] == pytest.approx(382.1, abs=0.5)
    assert val["dcf"]["per_share"] > 0 and val["price_to_life_fund"] is None
    assert [f["code"] for f in full["flags"]] == ["BFI_STRESS"]
    assert full["lockin"]["days_left"] == 40
    assert full["profile"]["promoter_pct"] == pytest.approx(55.66, abs=0.01)
    assert len(full["financials"]) == 1

    no_live = await get_company_full("NABIL", repo, TODAY)
    assert no_live["price"]["source"] == "eod" and no_live["quote"] is None
    assert await get_company_full("NOPE", repo, TODAY) is None
