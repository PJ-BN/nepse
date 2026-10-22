// Payloads from /api/v1/ws/live (see docs/CONTRACTS.md).
export type MarketStatus = "PRE_OPEN" | "OPEN" | "HALTED" | "CLOSED";

export type LiveQuote = {
  symbol: string;
  ltp: number;
  open?: number;
  high?: number;
  low?: number;
  prev_close?: number;
  change: number;
  pct_change: number;
  volume: number;
  turnover: number;
  ts?: string;
};

export type LiveIndex = { code: string; value: number; change: number; pct_change: number; turnover?: number | null; ts?: string };

export type WhaleTrade = {
  contract_no: number;
  symbol: string;
  buyer_broker: number;
  seller_broker: number;
  qty: number;
  rate: number;
  amount: number;
  trade_time: string;
};

export type LiveTopic = "quote" | "index" | "status" | "whale";

export type LiveMessage =
  | { topic: "snapshot"; data: { status: MarketStatus | null; quotes: Record<string, LiveQuote>; indices: Record<string, LiveIndex> } }
  | { topic: "quote"; data: Record<string, Partial<LiveQuote>> }
  | { topic: "index"; data: Record<string, Partial<LiveIndex>> }
  | { topic: "status"; data: MarketStatus | { status: MarketStatus } }
  | { topic: "whale"; data: WhaleTrade };
