"""TradingView UDF /history for daily bars, raw or adjusted for bonus/right issues."""
from datetime import UTC, date, datetime, time

from nepse.application.charting.ports import ChartRepository


def to_unix(d: date) -> int:
    return int(datetime.combine(d, time(), UTC).timestamp())  # daily bars sit at 00:00 UTC for TradingView


async def get_history(repo: ChartRepository, symbol: str, start: date, end: date, adjusted: bool) -> dict:
    bars = await repo.bars(symbol, start, end)
    if not bars:
        prev = await repo.last_date_before(symbol, start)
        return {"s": "no_data", "nextTime": to_unix(prev)} if prev else {"s": "no_data"}
    out: dict = {"s": "ok", "t": [], "o": [], "h": [], "l": [], "c": [], "v": []}
    for b in bars:
        f = b.adj_factor if adjusted else 1.0
        out["t"].append(to_unix(b.trade_date))
        for key, price in (("o", b.open), ("h", b.high), ("l", b.low), ("c", b.close)):
            out[key].append(round(price * f, 2))
        out["v"].append(round(b.volume / f))
    return out


INTRADAY = {"1": 1, "5": 5, "15": 15, "60": 60}  # TradingView resolution -> minutes per bar


async def get_intraday_history(repo: ChartRepository, symbol: str, start: datetime, end: datetime, resolution: str) -> dict:
    """UDF /history for intraday bars built from floorsheet ticks. Prices are raw: ticks carry no adj_factor."""
    bars = await repo.intraday_bars(symbol, start, end, INTRADAY[resolution])
    if not bars:
        return {"s": "no_data"}
    return {
        "s": "ok",
        "t": [int(b.ts.timestamp()) for b in bars],
        "o": [b.open for b in bars], "h": [b.high for b in bars],
        "l": [b.low for b in bars], "c": [b.close for b in bars], "v": [b.volume for b in bars],
    }
