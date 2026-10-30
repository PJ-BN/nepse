import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime, UTC

from nepse.main import app
from nepse.application.auth.ports import User
from nepse.presentation.api.v1.auth import current_user_id, get_session


@pytest.mark.asyncio
async def test_auth_me_api(client):
    app.dependency_overrides[current_user_id] = lambda: 42

    fake_session = AsyncMock()
    async def fake_session_provider():
        yield fake_session

    app.dependency_overrides[get_session] = fake_session_provider

    with patch("nepse.presentation.api.v1.auth.SqlUserRepo") as mock_repo_cls:
        mock_repo = mock_repo_cls.return_value
        now = datetime.now(UTC)
        mock_repo.get_by_id = AsyncMock(return_value=User(42, "trader@nepse.com", "hash", now))

        res = await client.get("/api/v1/auth/me")
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == 42
        assert data["email"] == "trader@nepse.com"

    app.dependency_overrides.clear()
