import pytest
from datetime import datetime, UTC
from unittest.mock import AsyncMock

from nepse.main import app
from nepse.application.auth.ports import User
from nepse.presentation.api.v1.auth import current_user_id, get_session, jwt_secret, require_admin


@pytest.mark.asyncio
async def test_sync_endpoints_reject_unauthenticated(client):
    """Unauthenticated requests must be rejected with 401."""
    app.dependency_overrides.clear()
    app.dependency_overrides[jwt_secret] = lambda: "x" * 32
    try:
        res = await client.get("/api/v1/sync/status")
        assert res.status_code == 401

        res_post = await client.post("/api/v1/sync/eod")
        assert res_post.status_code == 401
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_sync_endpoints_reject_normal_user(client):
    """Normal authenticated users (role='user') must be rejected with 403."""
    app.dependency_overrides.clear()
    app.dependency_overrides[jwt_secret] = lambda: "x" * 32
    app.dependency_overrides[current_user_id] = lambda: 99

    fake_session = AsyncMock()
    async def fake_session_provider():
        yield fake_session
    app.dependency_overrides[get_session] = fake_session_provider

    from unittest.mock import patch
    with patch("nepse.presentation.api.v1.auth.SqlUserRepo") as mock_repo_cls:
        mock_repo = mock_repo_cls.return_value
        normal_user = User(99, "normal@nepse.com", "hash", datetime.now(UTC), role="user")
        mock_repo.get_by_id = AsyncMock(return_value=normal_user)

        res = await client.get("/api/v1/sync/status")
        assert res.status_code == 403
        assert "privileges" in res.json().get("detail", "").lower()

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_sync_endpoints_allow_admin(client):
    """Admin users must be authorized to access sync endpoints."""
    admin_user = User(1, "admin@nepse.local", "hash", datetime.now(UTC), role="admin")
    app.dependency_overrides[require_admin] = lambda: admin_user

    # Mock the internal logic of status to avoid hitting real database in presentation unit test
    fake_session = AsyncMock()
    fake_scalar_res = AsyncMock()
    fake_scalar_res.scalar = lambda: None
    fake_session.execute = AsyncMock(return_value=fake_scalar_res)

    class MockSessionContext:
        async def __aenter__(self):
            return fake_session
        async def __aexit__(self, *args):
            pass

    import nepse.presentation.api.v1.sync as sync_module
    orig_session_local = sync_module.SessionLocal
    sync_module.SessionLocal = lambda: MockSessionContext()

    try:
        res = await client.get("/api/v1/sync/status")
        assert res.status_code == 200
        data = res.json()
        assert "is_syncing" in data
        assert "current_time_npt" in data
    finally:
        sync_module.SessionLocal = orig_session_local
        app.dependency_overrides.clear()
