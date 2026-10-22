import type { MarketStatus } from "@/features/live-feed";

export type Quote = { symbol: string; ltp: number; change: number; pct_change: number; volume: number; turnover: number; market_cap?: number | null };
export type IndexValue = { code: string; value: number; change: number; pct_change: number; turnover: number | null };

// GET /api/v1/market/summary
export type MarketSummary = {
  source: "live" | "eod" | "empty";
  status: MarketStatus;
  as_of: string | null;
  index: IndexValue | null;
  sub_indices: IndexValue[];
  turnover: number;
  advances: number;
  declines: number;
  unchanged: number;
  gainers: Quote[];
  losers: Quote[];
  top_turnover: Quote[];
  quotes: Quote[];
};
