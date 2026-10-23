"""TradingView UDF /history for daily bars, raw or adjusted for bonus/right issues."""
from datetime import UTC, date, datetime, time, timedelta

from nepse.application.charting.ports import ChartRepository


def to_unix(d: date) -> int:
    return int(datetime.combine(d, time(), UTC).timestamp())  # daily bars sit at 00:00 UTC for TradingView


def bucket_start(d: date, res: str) -> date:
    if res == "1W":
        return d - timedelta(days=(d.weekday() + 1) % 7)  # NEPSE weeks start on Sunday
    if res == "1M":
        return d.replace(day=1)
    return d


async def get_history(repo: ChartRepository, symbol: str, start: date, end: date, adjusted: bool, res: str = "1D") -> dict:
    """Daily bars, or weekly/monthly (res 1W/1M) aggregated from them."""
    bars = await repo.bars(symbol, start, end)
    if not bars:
        prev = await repo.last_date_before(symbol, start)
        return {"s": "no_data", "nextTime": to_unix(prev)} if prev else {"s": "no_data"}
    out: dict = {"s": "ok", "t": [], "o": [], "h": [], "l": [], "c": [], "v": []}
    last: date | None = None
    for b in bars:
        f = b.adj_factor if adjusted else 1.0
        o, h, l, c = (round(p * f, 2) for p in (b.open, b.high, b.low, b.close))
        key = bucket_start(b.trade_date, res)
        if key == last:
            out["h"][-1] = max(out["h"][-1], h)
            out["l"][-1] = min(out["l"][-1], l)
            out["c"][-1] = c
            out["v"][-1] += round(b.volume / f)
        else:
            last = key
            out["t"].append(to_unix(key))
            for k, v in (("o", o), ("h", h), ("l", l), ("c", c), ("v", round(b.volume / f))):
                out[k].append(v)
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
