"""Run a screener filter, built-in presets and CSV export."""
import csv
import io

from nepse.application.screener.filter_ast import OUTPUT_COLUMNS, parse_filter, parse_limit, parse_sort
from nepse.application.screener.ports import ScreenerRepository

LOW_CAP_NPR = 5_000_000_000  # NPR 5 billion market cap

PRESETS: dict[str, dict] = {
    "undervalued-banks": {
        "name": "Undervalued Banks",
        # ponytail: stub until feat/fundamentals merges; then add pe/pbv/graham-number conditions here.
        "description": "Commercial banks trading below their 200-day average (P/E and P/B filters arrive with fundamentals).",
        "filter": {"and": [
            {"field": "sector", "op": "=", "value": "BANKING"},
            {"field": "close", "op": "<", "value": {"field": "sma_200"}},
        ]},
        "sort": ["change_pct"],
    },
    "broker-cornered-low-cap-hydro": {
        "name": "Broker-Cornered Low-Cap Hydro",
        "description": "Hydropower under NPR 5 bn market cap where the top 3 net-buying brokers took over 30% of 15-day volume.",
        "filter": {"and": [
            {"field": "sector", "op": "=", "value": "HYDRO"},
            {"field": "market_cap", "op": "<", "value": LOW_CAP_NPR},
            {"field": "top3_broker_accum_15d_pct", "op": ">", "value": 30},
        ]},
        "sort": ["-top3_broker_accum_15d_pct"],
    },
    "rsi-oversold-above-sma200": {
        "name": "RSI oversold above SMA200",
        "description": "RSI(14) under 30 while price holds above the 200-day average: a pullback in an uptrend.",
        "filter": {"and": [
            {"field": "rsi_14", "op": "<", "value": 30},
            {"field": "close", "op": ">", "value": {"field": "sma_200"}},
        ]},
        "sort": ["rsi_14"],
    },
}


async def run_screener(repo: ScreenerRepository, filter: object = None, sort: object = None,
                       limit: object = 100) -> list[dict]:
    """Raises filter_ast.FilterError on any invalid input, before touching the repository."""
    return await repo.query(parse_filter(filter), parse_sort(sort), parse_limit(limit))


async def run_preset(repo: ScreenerRepository, preset_id: str, limit: int = 100) -> list[dict]:
    p = PRESETS[preset_id]
    return await run_screener(repo, p["filter"], p["sort"], limit)


def to_csv(rows: list[dict]) -> str:
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=OUTPUT_COLUMNS, extrasaction="ignore", lineterminator="\n")
    w.writeheader()
    w.writerows(rows)
    return buf.getvalue()
