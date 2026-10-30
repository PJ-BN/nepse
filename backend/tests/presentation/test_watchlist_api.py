import pytest
from unittest.mock import AsyncMock, patch

from nepse.main import app
from nepse.presentation.api.v1.auth import current_user_id
from nepse.presentation.api.v1.watchlist import get_session


@pytest.mark.asyncio
async def test_watchlist_api_endpoints(client):
    # Override current_user_id to return user_id = 99
    app.dependency_overrides[current_user_id] = lambda: 99

    fake_session = AsyncMock()
    async def fake_session_provider():
        yield fake_session

    app.dependency_overrides[get_session] = fake_session_provider

    with patch("nepse.presentation.api.v1.watchlist.SqlWatchlistRepo") as mock_repo_cls:
        mock_repo = mock_repo_cls.return_value
        mock_repo.get_watchlist = AsyncMock(return_value=["NABIL", "CHCL"])
        mock_repo.add_symbol = AsyncMock(return_value=True)
        mock_repo.remove_symbol = AsyncMock(return_value=True)
        mock_repo.set_watchlist = AsyncMock(return_value=["GBIME"])

        # GET
        res = await client.get("/api/v1/user/watchlist")
        assert res.status_code == 200
        assert res.json() == ["NABIL", "CHCL"]

        # POST add symbol
        res = await client.post("/api/v1/user/watchlist", json={"symbol": "HDL"})
        assert res.status_code == 200
        mock_repo.add_symbol.assert_awaited_with(99, "HDL")

        # DELETE symbol
        res = await client.delete("/api/v1/user/watchlist/CHCL")
        assert res.status_code == 200
        mock_repo.remove_symbol.assert_awaited_with(99, "CHCL")

        # PUT sync watchlist
        res = await client.put("/api/v1/user/watchlist", json={"symbols": ["GBIME"]})
        assert res.status_code == 200
        assert res.json() == ["GBIME"]

    app.dependency_overrides.clear()
