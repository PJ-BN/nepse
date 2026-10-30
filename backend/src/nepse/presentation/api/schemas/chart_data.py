from typing import Any
from pydantic import BaseModel, Field


class DrawingsIn(BaseModel):
    drawings: list[dict[str, Any]] = Field(default_factory=list)


class LayoutIn(BaseModel):
    settings: dict[str, Any] = Field(default_factory=dict)


class LayoutsSyncIn(BaseModel):
    layouts: dict[str, Any] = Field(default_factory=dict)
