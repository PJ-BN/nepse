from typing import Any

from nepse.application.chart_data.ports import ChartDataRepo


def _normalise(symbol: str) -> str:
    return symbol.strip().upper()


async def get_user_drawings(repo: ChartDataRepo, user_id: int, symbol: str) -> list[dict[str, Any]]:
    return await repo.get_drawings(user_id, _normalise(symbol))


async def save_user_drawings(
    repo: ChartDataRepo, user_id: int, symbol: str, drawings: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    return await repo.save_drawings(user_id, _normalise(symbol), drawings)


async def delete_user_drawings(repo: ChartDataRepo, user_id: int, symbol: str) -> bool:
    return await repo.delete_drawings(user_id, _normalise(symbol))


async def get_user_layouts(repo: ChartDataRepo, user_id: int) -> dict[str, Any]:
    return await repo.get_layouts(user_id)


async def save_user_layout(
    repo: ChartDataRepo, user_id: int, name: str, settings: dict[str, Any]
) -> dict[str, Any]:
    clean_name = name.strip()
    return await repo.save_layout(user_id, clean_name, settings)


async def delete_user_layout(repo: ChartDataRepo, user_id: int, name: str) -> bool:
    clean_name = name.strip()
    return await repo.delete_layout(user_id, clean_name)


async def sync_user_layouts(
    repo: ChartDataRepo, user_id: int, layouts: dict[str, Any]
) -> dict[str, Any]:
    return await repo.sync_layouts(user_id, layouts)
