from nepse.application.floorsheet.analytics import detect_whales
from nepse.application.ingestion.ports import LiveStore, MarketDataSource


async def poll_whales(source: MarketDataSource, store: LiveStore) -> int:
    """Publish a `whale` event for each new block trade since the last poll; returns how many."""
    last = await store.get_last_contract()
    # ponytail: reads only the newest page (500 trades); at NEPSE's ~3 trades/s a 20s poll never overflows it.
    trades = sorted((t for t in await source.latest_trades() if last is None or t.contract_no > last),
                    key=lambda t: t.contract_no)
    if not trades:
        return 0
    await store.set_last_contract(trades[-1].contract_no)
    if last is None:  # first run only sets the cursor; replaying the whole day would flood clients
        return 0
    whales = detect_whales(trades)
    for whale in whales:
        await store.publish("whale", whale)
    return len(whales)
