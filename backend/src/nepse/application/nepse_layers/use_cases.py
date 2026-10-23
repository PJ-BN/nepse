"""Chart layers specific to NEPSE: circuit-limit prices, corporate-action markers, volume-at-price."""
from dataclasses import asdict
from datetime import date, datetime, time, timedelta

from nepse.application.calendar.ports import CalendarRepository
from nepse.application.nepse_layers.ports import NepseLayersRepository
from nepse.domain.calendar.npt import NPT
from nepse.domain.market.circuit import circuit_limits, volume_profile


async def get_circuit_limits(repo: NepseLayersRepository, symbol: str, start: date, end: date, adjusted: bool) -> list[dict]:
    out = []
    for d in await repo.daily_closes(symbol, start, end):
        if d.prev_close is None:
            continue
        f = d.adj_factor if adjusted else 1.0  # same factor the candles are drawn with
        lower, upper = circuit_limits(d.prev_close)
        out.append({"date": d.trade_date, "lower": round(lower * f, 2), "upper": round(upper * f, 2)})
    return out


async def get_corporate_actions(repo: CalendarRepository, symbol: str) -> list[dict]:
    events = await repo.dividend_events(symbol=symbol, limit=200)
    return [
        {"date": e.book_closure_date, "fy": e.fy_bs, "bonus_pct": e.bonus_pct, "cash_pct": e.cash_pct,
         "right_ratio": e.right_ratio}
        for e in events if e.book_closure_date and (e.bonus_pct or e.cash_pct or e.right_ratio)
    ]


async def get_volume_profile(repo: NepseLayersRepository, symbol: str, start: date, end: date, bins: int) -> dict:
    day = lambda d: datetime.combine(d, time(), NPT)  # noqa: E731
    levels = await repo.trade_levels(symbol, day(start), day(end) + timedelta(days=1))
    rows, poc = volume_profile(levels, bins)
    return {"bins": [asdict(b) for b in rows], "poc": poc}
