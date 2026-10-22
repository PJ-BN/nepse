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
