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

export const RESOLUTIONS = ["1", "5", "15", "60", "1D"] as const;
export type Resolution = (typeof RESOLUTIONS)[number];
