from nepse.application.market.poll_live_market import poll_live_market
from nepse.domain.market.entities import IndexTick
from nepse.domain.market.session import MarketStatus

from .fakes import TS, FakeSource, FakeStore, quote


async def test_first_poll_publishes_full_snapshot_and_status():
    store = FakeStore()
    source = FakeSource(quotes=[quote("NABIL", 510), quote("HDL", 900)],
                        indices=[IndexTick("NEPSE", 2700, 10, 0.37, None, TS)])
    result = await poll_live_market(source, store, TS)
    assert result.status is MarketStatus.OPEN
    assert [topic for topic, _ in store.events] == ["status", "quote", "index"]
    assert set(store.quotes) == {"NABIL", "HDL"}


async def test_second_poll_publishes_only_changes():
    store = FakeStore()
    source = FakeSource(quotes=[quote("NABIL", 510), quote("HDL", 900)])
    await poll_live_market(source, store, TS)
    store.events.clear()
    source.quotes = [quote("NABIL", 512), quote("HDL", 900)]
    result = await poll_live_market(source, store, TS)
    assert store.events == [("quote", {"NABIL": quote("NABIL", 512)})]
    assert result.quotes_changed == 1
    assert set(store.quotes) == {"NABIL", "HDL"}  # snapshot stays complete


async def test_upstream_closed_reports_closed_during_clock_hours():
    store = FakeStore()
    result = await poll_live_market(FakeSource(is_open=False), store, TS)
    assert result.status is MarketStatus.CLOSED
    assert store.events == [("status", "CLOSED")]
