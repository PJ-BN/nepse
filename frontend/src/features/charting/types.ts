export type UdfHistory =
  | { s: "ok"; t: number[]; o: number[]; h: number[]; l: number[]; c: number[]; v: number[] }
  | { s: "no_data"; nextTime?: number }
  | { s: "error"; errmsg: string };

export type UdfSearchItem = {
  symbol: string;
  full_name: string;
  description: string;
  exchange: string;
  ticker: string;
  type: string;
};

export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

/** A horizontal price line drawn over the candles (e.g. a broker VWAP). */
export type PriceOverlay = { price: number; title: string; color: string };

export const RESOLUTIONS = ["1", "5", "15", "60", "1D", "1W", "1M"] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

export const RESOLUTION_LABEL: Record<Resolution, string> = {
  "1": "1m", "5": "5m", "15": "15m", "60": "1h", "1D": "1D", "1W": "1W", "1M": "1M",
};
export const isIntraday = (r: Resolution) => r === "1" || r === "5" || r === "15" || r === "60";

// Mirrors backend domain/market/indices.py: these chart from index_daily (daily bars only, no adjustment).
export const INDEX_CODES = [
  "NEPSE", "FLOAT", "SENSITIVE", "SENSFLOAT", "BANKING", "DEVBANK", "FINANCE", "MICROFIN", "LIFEINSU",
  "NONLIFE", "HYDRO", "MANUFAC", "HOTEL", "TRADING", "INVEST", "OTHERS", "MUTUAL",
];

export type IndicatorType = "sma" | "ema" | "bb" | "rsi" | "macd";
export type Indicator = { id: string; type: IndicatorType; period: number; color: string };

export const DEFAULT_INDICATORS: Indicator[] = [
  { id: "sma20", type: "sma", period: 20, color: "#f59e0b" },
  { id: "sma50", type: "sma", period: 50, color: "#3b82f6" },
  { id: "rsi14", type: "rsi", period: 14, color: "#a855f7" },
];
