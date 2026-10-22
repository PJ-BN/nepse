from typing import Any, Literal

from pydantic import BaseModel, Field


class ScreenerRunRequest(BaseModel):
    """`filter` and `sort` stay untyped here on purpose: application.screener.filter_ast validates them strictly."""
    filter: dict[str, Any] | None = None
    sort: list[str] | str | None = None
    limit: int = Field(100, ge=1, le=1000)
    preset: str | None = None  # use a preset's filter/sort instead of `filter`/`sort`
    format: Literal["json", "csv", "xlsx"] = "json"


class ScreenerRunResponse(BaseModel):
    columns: list[str]
    count: int
    rows: list[dict[str, Any]]


class PresetOut(BaseModel):
    id: str
    name: str
    description: str
    filter: dict[str, Any]
    sort: list[str]
