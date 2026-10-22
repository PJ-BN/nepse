"""NepseAlpha TradingView-UDF history (adjusted OHLCV). Verification reference only, never an ingestion source."""
from datetime import UTC, date, datetime, time

from curl_cffi import requests

BASE = "https://nepsealpha.com"  # Cloudflare-fronted but open to Chrome-impersonated clients; no login needed


def parse_history(payload: dict) -> dict[date, float]:
    """UDF `{"s","t","c",...}` -> {trade date: adjusted close}. `no_data` (or unknown symbol) -> {}."""
    if payload.get("s") != "ok":
        return {}
    return {datetime.fromtimestamp(t, UTC).date(): float(c) for t, c in zip(payload["t"], payload["c"], strict=True)}


class NepseAlphaClient:
    async def adjusted_closes(self, symbol: str, start: date, end: date) -> dict[date, float]:
        params = {
            "symbol": symbol, "resolution": "1D",
            "from": int(datetime.combine(start, time(), UTC).timestamp()),
            "to": int(datetime.combine(end, time(), UTC).timestamp()),
        }
        async with requests.AsyncSession(impersonate="chrome") as s:
            r = await s.get(f"{BASE}/trading/1/history", params=params, timeout=30)
        r.raise_for_status()
        return parse_history(r.json())
