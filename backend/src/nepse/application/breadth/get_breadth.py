"""Market breadth from adjusted daily closes: A/D, McClellan oscillator, % above 20/50/200-day SMA."""
from collections import defaultdict
from datetime import date

from nepse.application.breadth.ports import BreadthRepository
from nepse.domain.technicals.breadth import advance_decline, mcclellan_oscillator, pct_above_sma

HISTORY_DAYS = 400  # calendar days: enough for SMA200 and a warmed-up McClellan
SERIES_POINTS = 60


async def get_breadth(repo: BreadthRepository) -> dict | None:
    closes = await repo.adjusted_closes(HISTORY_DAYS)
    changes_by_day: dict[date, list[float]] = defaultdict(list)
    for series in closes.values():
        for (_, prev), (d, cur) in zip(series, series[1:]):
            changes_by_day[d].append(cur - prev)
    if not changes_by_day:
        return None
    days = sorted(changes_by_day)
    ads = [advance_decline(changes_by_day[d]) for d in days]
    osc = mcclellan_oscillator([a.net for a in ads])
    latest = ads[-1]
    only_closes = {s: [c for _, c in series] for s, series in closes.items()}
    return {
        "as_of": days[-1],
        "advances": latest.advances,
        "declines": latest.declines,
        "unchanged": latest.unchanged,
        "mcclellan": osc[-1],
        "pct_above": {f"sma_{n}": pct_above_sma(only_closes, n) for n in (20, 50, 200)},
        "series": [
            {"date": d, "advances": a.advances, "declines": a.declines, "net": a.net, "mcclellan": o}
            for d, a, o in list(zip(days, ads, osc))[-SERIES_POINTS:]
        ],
    }
