import pytest

from nepse.application.watchlist import use_cases


class FakeWatchlistRepo:
    def __init__(self, initial=None):
        self._items = list(initial or [])

    async def get_watchlist(self, user_id: int) -> list[str]:
        return list(self._items)

    async def add_symbol(self, user_id: int, symbol: str) -> bool:
        if symbol not in self._items:
            self._items.append(symbol)
            return True
        return False

    async def remove_symbol(self, user_id: int, symbol: str) -> bool:
        if symbol in self._items:
            self._items.remove(symbol)
            return True
        return False

    async def set_watchlist(self, user_id: int, symbols: list[str]) -> list[str]:
        self._items = list(symbols)
        return list(self._items)


@pytest.mark.asyncio
async def test_watchlist_use_cases():
    repo = FakeWatchlistRepo(["NABIL"])

    # Get
    res = await use_cases.get_user_watchlist(repo, 1)
    assert res == ["NABIL"]

    # Add
    res = await use_cases.add_to_watchlist(repo, 1, "chcl")
    assert res == ["NABIL", "CHCL"]

    # Add duplicate (case-insensitive)
    res = await use_cases.add_to_watchlist(repo, 1, "NABIL")
    assert res == ["NABIL", "CHCL"]

    # Remove
    res = await use_cases.remove_from_watchlist(repo, 1, "nabil")
    assert res == ["CHCL"]

    # Sync
    res = await use_cases.sync_watchlist(repo, 1, ["HDL", "gbime", "HDL"])
    assert res == ["HDL", "GBIME"]
