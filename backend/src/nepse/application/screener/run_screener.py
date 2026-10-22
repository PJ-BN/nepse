"""Run a screener filter, built-in presets and CSV/Excel export."""
import csv
import io

from openpyxl import Workbook

from nepse.application.screener.filter_ast import OUTPUT_COLUMNS, parse_filter, parse_limit, parse_sort
from nepse.application.screener.ports import ScreenerRepository

LOW_CAP_NPR = 5_000_000_000  # NPR 5 billion market cap

PRESETS: dict[str, dict] = {
    "undervalued-banks": {
        "name": "Undervalued Banks",
        "description": "Commercial banks under 1.5x book, priced below their Graham number, NPL under the 4.5% flag.",
        "filter": {"and": [
            {"field": "sector", "op": "=", "value": "BANKING"},
            {"field": "pbv", "op": "<", "value": 1.5},
            {"field": "close", "op": "<", "value": {"field": "graham_number"}},
            {"field": "npl_pct", "op": "<", "value": 4.5},
        ]},
        "sort": ["pbv"],
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
    "rsi-bullish-divergence": {
        "name": "RSI bullish divergence",
        "description": "Price made a lower low over the last 15 sessions while RSI(14) made a higher low: selling momentum is fading.",
        "filter": {"and": [{"field": "rsi_bull_div", "op": "=", "value": 1}]},
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


def to_xlsx(rows: list[dict]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Screener"
    ws.append(list(OUTPUT_COLUMNS))
    for r in rows:
        ws.append([r.get(c) for c in OUTPUT_COLUMNS])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
