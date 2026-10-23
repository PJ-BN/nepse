from datetime import date
from typing import Annotated, Any

from pydantic import BaseModel, Field


class SimulationRunRequest(BaseModel):
    """`rules` stays untyped on purpose: nepse.domain.simulation.rules.parse validates it strictly."""
    symbol: str = Field(min_length=1, max_length=20)
    anchor_date: date
    rules: Any
    horizons: list[Annotated[int, Field(ge=1, le=250)]] = Field([5, 10, 20, 60], min_length=1, max_length=8)
    target_pct: float | None = Field(None, gt=0, le=1000)
    stop_pct: float | None = Field(None, gt=0, le=100)
    cost_pct: float = Field(0.0, ge=0, le=100)
    events_from: date | None = None


class Bar(BaseModel):
    t: str
    o: float | None
    h: float | None
    l: float | None
    c: float | None
    v: int


class IndicatorSeries(BaseModel):
    name: str
    pane: str  # price | oscillator
    values: list[float | None]


class ConditionState(BaseModel):
    left: str
    op: str
    right: str
    left_value: float | None
    right_value: float | None
    met: bool


class Anchor(BaseModel):
    date: str
    requested_date: str
    fired: bool
    conditions: list[ConditionState]
    values: dict[str, float | None]


class HorizonResult(BaseModel):
    horizon: int
    ret: float | None
    mfe: float | None
    mae: float | None


class Bracket(BaseModel):
    outcome: str  # target | stop | neither | open
    bars: int | None
    ret: float | None


class PathPoint(BaseModel):
    t: str
    ret: float | None


class Forward(BaseModel):
    entry_date: str
    entry_price: float | None
    path: list[PathPoint]
    results: list[HorizonResult]
    bracket: Bracket | None


class Event(BaseModel):
    date: str
    entry_date: str
    entry_price: float | None
    results: list[HorizonResult]
    bracket: Bracket | None


class HorizonStats(BaseModel):
    horizon: int
    count: int
    win_rate: float | None
    avg_return: float | None
    median_return: float | None


class Stats(BaseModel):
    events: int
    horizons: list[HorizonStats]


class SimulationRunResponse(BaseModel):
    symbol: str
    bars: list[Bar]
    indicators: list[IndicatorSeries]
    anchor: Anchor
    forward: Forward | None
    events: list[Event]
    stats: Stats
    warnings: list[str]
