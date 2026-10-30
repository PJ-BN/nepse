import pytest
from unittest.mock import AsyncMock, patch

from nepse.main import app
from nepse.presentation.api.v1.auth import current_user_id
from nepse.presentation.api.v1.chart_data import get_session


@pytest.mark.asyncio
async def test_chart_data_api_endpoints(client):
    app.dependency_overrides[current_user_id] = lambda: 42

    fake_session = AsyncMock()
    async def fake_session_provider():
        yield fake_session

    app.dependency_overrides[get_session] = fake_session_provider

    with patch("nepse.presentation.api.v1.chart_data.SqlChartDataRepo") as mock_repo_cls:
        mock_repo = mock_repo_cls.return_value
        sample_drawings = [{"name": "straightLine", "points": [{"value": 100}]}]
        mock_repo.get_drawings = AsyncMock(return_value=sample_drawings)
        mock_repo.save_drawings = AsyncMock(return_value=sample_drawings)
        mock_repo.delete_drawings = AsyncMock(return_value=True)

        mock_repo.get_layouts = AsyncMock(return_value={"My Layout": {"type": "candle_solid"}})
        mock_repo.save_layout = AsyncMock(return_value={"My Layout": {"type": "candle_solid"}})
        mock_repo.delete_layout = AsyncMock(return_value=True)
        mock_repo.sync_layouts = AsyncMock(return_value={"Template": {}})

        # 1. GET drawings
        res = await client.get("/api/v1/user/chart/drawings/NABIL")
        assert res.status_code == 200
        assert res.json() == sample_drawings

        # 2. PUT drawings
        res = await client.put("/api/v1/user/chart/drawings/NABIL", json={"drawings": sample_drawings})
        assert res.status_code == 200
        assert res.json() == sample_drawings

        # 3. DELETE drawings
        res = await client.delete("/api/v1/user/chart/drawings/NABIL")
        assert res.status_code == 200
        assert res.json()["deleted"] is True

        # 4. GET layouts
        res = await client.get("/api/v1/user/chart/layouts")
        assert res.status_code == 200
        assert "My Layout" in res.json()

        # 5. PUT layout by name
        res = await client.put("/api/v1/user/chart/layouts/My%20Layout", json={"settings": {"type": "candle_solid"}})
        assert res.status_code == 200

        # 6. DELETE layout
        res = await client.delete("/api/v1/user/chart/layouts/My%20Layout")
        assert res.status_code == 200

        # 7. PUT bulk sync layouts
        res = await client.put("/api/v1/user/chart/layouts", json={"layouts": {"Template": {}}})
        assert res.status_code == 200

    app.dependency_overrides.clear()
