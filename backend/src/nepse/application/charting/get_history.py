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
