import { getJson } from "@/shared/api/http";
import type { Candle, UdfHistory, UdfSearchItem } from "./types";

// Client for the backend's TradingView UDF endpoints (/api/v1/udf/*).
const UDF = "/api/v1/udf";

export async function fetchHistory(symbol: string, from: number, to: number, adjusted: boolean): Promise<Candle[]> {
  const q = new URLSearchParams({ symbol, from: String(from), to: String(to), resolution: "1D", adjusted: String(adjusted) });
  const h = await getJson<UdfHistory>(`${UDF}/history?${q}`);
  if (h.s === "error") throw new Error(h.errmsg);
  if (h.s !== "ok") return [];
  return h.t.map((time, i) => ({ time, open: h.o[i], high: h.h[i], low: h.l[i], close: h.c[i], volume: h.v[i] }));
}

export function searchSymbols(query: string, limit = 20): Promise<UdfSearchItem[]> {
  return getJson<UdfSearchItem[]>(`${UDF}/search?${new URLSearchParams({ query, limit: String(limit) })}`);
}
