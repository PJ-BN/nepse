import pytest
from nepse.application.chart_data import use_cases


class FakeChartDataRepo:
    def __init__(self):
        self._drawings = {}
        self._layouts = {}

    async def get_drawings(self, user_id: int, symbol: str) -> list[dict]:
        return list(self._drawings.get((user_id, symbol), []))

    async def save_drawings(self, user_id: int, symbol: str, drawings: list[dict]) -> list[dict]:
        self._drawings[(user_id, symbol)] = list(drawings)
        return list(drawings)

    async def delete_drawings(self, user_id: int, symbol: str) -> bool:
        if (user_id, symbol) in self._drawings:
            del self._drawings[(user_id, symbol)]
            return True
        return False

    async def get_layouts(self, user_id: int) -> dict[str, dict]:
        return dict(self._layouts.get(user_id, {}))

    async def save_layout(self, user_id: int, name: str, settings: dict) -> dict[str, dict]:
        if user_id not in self._layouts:
            self._layouts[user_id] = {}
        self._layouts[user_id][name] = dict(settings)
        return dict(self._layouts[user_id])

    async def delete_layout(self, user_id: int, name: str) -> bool:
        if user_id in self._layouts and name in self._layouts[user_id]:
            del self._layouts[user_id][name]
            return True
        return False

    async def sync_layouts(self, user_id: int, layouts: dict[str, dict]) -> dict[str, dict]:
        self._layouts[user_id] = dict(layouts)
        return dict(self._layouts[user_id])


@pytest.mark.asyncio
async def test_chart_data_drawings_use_cases():
    repo = FakeChartDataRepo()

    # Initial drawings are empty
    res = await use_cases.get_user_drawings(repo, 1, "nabil")
    assert res == []

    # Save drawings
    sample_drawings = [{"name": "segment", "points": [{"timestamp": 12345, "value": 500}]}]
    saved = await use_cases.save_user_drawings(repo, 1, "NABIL", sample_drawings)
    assert len(saved) == 1
    assert saved[0]["name"] == "segment"

    # Get drawings (case insensitive symbol)
    fetched = await use_cases.get_user_drawings(repo, 1, "nabil")
    assert len(fetched) == 1
    assert fetched[0]["name"] == "segment"

    # Delete drawings
    deleted = await use_cases.delete_user_drawings(repo, 1, "NABIL")
    assert deleted is True
    assert await use_cases.get_user_drawings(repo, 1, "NABIL") == []


@pytest.mark.asyncio
async def test_chart_data_layouts_use_cases():
    repo = FakeChartDataRepo()

    # Save layout
    res = await use_cases.save_user_layout(repo, 1, "Breakout Setup", {"type": "candle_solid", "axis": "normal"})
    assert "Breakout Setup" in res
    assert res["Breakout Setup"]["type"] == "candle_solid"

    # Get layouts
    all_layouts = await use_cases.get_user_layouts(repo, 1)
    assert "Breakout Setup" in all_layouts

    # Delete layout
    deleted = await use_cases.delete_user_layout(repo, 1, "Breakout Setup")
    assert deleted is True
    assert await use_cases.get_user_layouts(repo, 1) == {}

    # Sync layouts
    synced = await use_cases.sync_user_layouts(repo, 1, {"Template A": {"axis": "log"}, "Template B": {}})
    assert len(synced) == 2
