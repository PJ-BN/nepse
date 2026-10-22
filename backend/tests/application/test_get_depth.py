from nepse.application.market.get_depth import get_depth
from nepse.domain.market.depth import DepthLevel, MarketDepth

from .fakes import TS, FakeStore


class CountingSource:
    calls = 0

    async def market_depth(self, symbol, nepse_id):
        self.calls += 1
        return MarketDepth(symbol, (DepthLevel(510, 100, 1),), (), 100, 0, TS)


async def test_depth_is_fetched_once_then_served_from_store():
    store, source = FakeStore(), CountingSource()
    first = await get_depth("NABIL", 131, source, store)
    assert await get_depth("NABIL", 131, source, store) == first
    assert source.calls == 1
    assert [t for t, _ in store.events] == ["depth"]
