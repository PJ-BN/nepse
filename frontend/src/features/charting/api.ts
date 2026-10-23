import { getJson } from "@/shared/api/http";
import { isIntraday, type Candle, type Resolution, type UdfHistory, type UdfSearchItem } from "./types";

// Client for the backend's TradingView UDF endpoints (/api/v1/udf/*).
const UDF = "/api/v1/udf";

const NPT_OFFSET = 20_700; // +05:45; intraday bar times are shifted so the chart axis shows Nepal time

export async function fetchHistory(
  symbol: string,
  from: number,
  to: number,
  adjusted: boolean,
  resolution: Resolution = "1D",
): Promise<Candle[]> {
  const q = new URLSearchParams({ symbol, from: String(from), to: String(to), resolution, adjusted: String(adjusted) });
  const h = await getJson<UdfHistory>(`${UDF}/history?${q}`);
  if (h.s === "error") throw new Error(h.errmsg);
  if (h.s !== "ok") return [];
  const shift = isIntraday(resolution) ? NPT_OFFSET : 0;
  return h.t.map((time, i) => ({ time: time + shift, open: h.o[i], high: h.h[i], low: h.l[i], close: h.c[i], volume: h.v[i] }));
}

export function searchSymbols(query: string, limit = 20): Promise<UdfSearchItem[]> {
  return getJson<UdfSearchItem[]>(`${UDF}/search?${new URLSearchParams({ query, limit: String(limit) })}`);
}
