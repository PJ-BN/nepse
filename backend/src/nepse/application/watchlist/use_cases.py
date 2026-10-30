from nepse.application.watchlist.ports import WatchlistRepo


def _normalise(symbol: str) -> str:
    return symbol.strip().upper()


async def get_user_watchlist(repo: WatchlistRepo, user_id: int) -> list[str]:
    return await repo.get_watchlist(user_id)


async def add_to_watchlist(repo: WatchlistRepo, user_id: int, symbol: str) -> list[str]:
    clean = _normalise(symbol)
    if clean:
        await repo.add_symbol(user_id, clean)
    return await repo.get_watchlist(user_id)


async def remove_from_watchlist(repo: WatchlistRepo, user_id: int, symbol: str) -> list[str]:
    clean = _normalise(symbol)
    if clean:
        await repo.remove_symbol(user_id, clean)
    return await repo.get_watchlist(user_id)


async def sync_watchlist(repo: WatchlistRepo, user_id: int, symbols: list[str]) -> list[str]:
    cleaned = list(dict.fromkeys(_normalise(s) for s in symbols if _normalise(s)))
    return await repo.set_watchlist(user_id, cleaned)
