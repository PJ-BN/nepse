from datetime import date, datetime
from decimal import Decimal

from nepse.application.ingestion.ports import MarketOpen
from nepse.domain.calendar.npt import NPT
from nepse.domain.market.entities import DailyBar, FloorsheetTick, IndexBar, IndexTick, ListedCompany, Quote

TS = datetime(2025, 4, 20, 11, 0, tzinfo=NPT)  # a Sunday, market open


def quote(symbol: str, ltp: float) -> Quote:
    return Quote(symbol, ltp, ltp, ltp, ltp, 100.0, round(ltp - 100, 2), round(ltp - 100, 2), 10, ltp * 10, TS)


def tick(contract: int, symbol: str = "NABIL", buyer: int = 1, seller: int = 2) -> FloorsheetTick:
    return FloorsheetTick(contract, symbol, buyer, seller, 10, Decimal("500"), Decimal("5000"), TS, f"B{buyer}", f"B{seller}")


class FakeSource:
    def __init__(self, is_open=True, quotes=(), indices=(), pages=()):
        self.is_open, self.quotes, self.indices, self.pages = is_open, list(quotes), list(indices), list(pages)
        self.latest = []

    async def market_open(self):
        return MarketOpen(self.is_open, TS, 80)

    async def live_quotes(self):
        return self.quotes

    async def live_indices(self):
        return self.indices

    async def listed_companies(self):
        return [ListedCompany("NABIL", "Nabil Bank", "BANKING", "EQUITY", "ACTIVE", 131)]

    async def today_prices(self):
        p = Decimal("500")
        return [DailyBar("NABIL", date(2025, 4, 20), p, p, p, p, p, 10, p * 10, 1),
                DailyBar("NEWCO", date(2025, 4, 20), p, p, p, p, p, 10, p * 10, 1)]

    async def index_bars(self):
        v = Decimal("2700")
        return [IndexBar("NEPSE", date(2025, 4, 20), v, v, v, v, None)]

    async def floorsheet(self):
        for page in self.pages:
            yield page

    async def latest_trades(self):
        return self.latest


class FakeStore:
    def __init__(self):
        self.status, self.quotes, self.indices, self.events = None, {}, {}, []
        self.last_contract = None

    async def get_last_contract(self):
        return self.last_contract

    async def set_last_contract(self, contract_no):
        self.last_contract = contract_no

    async def get_status(self):
        return self.status

    async def get_quotes(self):
        return dict(self.quotes)

    async def get_indices(self):
        return dict(self.indices)

    async def save(self, status, quotes, indices):
        self.status, self.quotes, self.indices = status, quotes, indices

    async def publish(self, topic, data):
        self.events.append((topic, data))


class FakeRepo:
    def __init__(self):
        self.ticks, self.brokers, self.refreshed, self.bars = {}, {}, [], []
        self.earliest = {}

    async def active_symbols(self):
        return ["NABIL", "HDL", "BAD"]

    async def earliest_bar_date(self, symbol):
        return self.earliest.get(symbol)

    async def upsert_corporate_actions(self, actions):
        return len(actions), set()

    async def upsert_companies(self, companies):
        return len(companies)

    async def upsert_daily_bars(self, bars):
        known = [b for b in bars if b.symbol != "NEWCO"]
        self.bars += known
        return len(known), {b.symbol for b in bars if b.symbol == "NEWCO"}

    async def upsert_index_bars(self, bars):
        return len(bars)

    async def insert_floorsheet(self, ticks):
        new = [t for t in ticks if t.contract_no not in self.ticks]
        self.ticks |= {t.contract_no: t for t in new}
        return len(new), set()

    async def upsert_brokers(self, names):
        self.brokers |= names

    async def refresh_broker_aggregates(self, start, end):
        self.refreshed.append((start, end))


class FakeHistory:
    def __init__(self, fail: set[str] = frozenset()):
        self.fail, self.calls = fail, []

    async def history(self, symbol, since):
        self.calls.append(symbol)
        if symbol in self.fail:
            raise RuntimeError("upstream down")
        p = Decimal("100")
        return [DailyBar(symbol, since, p, p, p, p, None, 1, p, None)], []
