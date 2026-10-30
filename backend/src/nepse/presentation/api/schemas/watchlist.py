from pydantic import BaseModel, Field


class WatchlistSymbolIn(BaseModel):
    symbol: str = Field(min_length=1, max_length=20)


class WatchlistSyncIn(BaseModel):
    symbols: list[str] = Field(default_factory=list)
