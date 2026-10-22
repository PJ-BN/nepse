from dataclasses import replace

from nepse.application.market.poll_whales import poll_whales

from .fakes import FakeSource, FakeStore, tick


def whale(contract: int):
    return replace(tick(contract), qty=6000)  # >= 5,000 shares


async def test_first_run_sets_cursor_without_replaying_the_day():
    store, source = FakeStore(), FakeSource()
    source.latest = [whale(5), tick(4)]
    assert await poll_whales(source, store) == 0
    assert store.last_contract == 5 and store.events == []


async def test_publishes_only_new_whales_in_contract_order():
    store, source = FakeStore(), FakeSource()
    store.last_contract = 5
    source.latest = [whale(9), tick(8), whale(7), whale(5), tick(3)]
    assert await poll_whales(source, store) == 2
    assert [data["contract_no"] for topic, data in store.events if topic == "whale"] == [7, 9]
    assert store.last_contract == 9
    assert await poll_whales(source, store) == 0  # nothing new
