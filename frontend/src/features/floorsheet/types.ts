// Mirrors backend/src/nepse/application/floorsheet/analytics.py.
export const WINDOWS = [1, 5, 15, 30, 90] as const;

export type CostBasisRow = {
  broker: number;
  buy_qty: number;
  sell_qty: number;
  net: number;
  buy_vwap: number | null;
  sell_vwap: number | null;
  bar: number;
  margin_pct: number | null;
  unrealised_pl: number | null;
};

export type SankeyLink = { buyer: number; seller: number; qty: number };

export type BrokerAnalytics = {
  symbol: string;
  days: number;
  from_day: string | null;
  ltp: number | null;
  total_volume: number;
  cornering_index: number;
  float_market_cap: number | null;
  cornering_alert: boolean;
  rows: CostBasisRow[];
  sankey: SankeyLink[];
};

// Same shape as the `whale` event on nepse:live:events (docs/CONTRACTS.md).
export type WhaleEvent = {
  contract_no: number;
  symbol: string;
  buyer_broker: number;
  seller_broker: number;
  qty: number;
  rate: number;
  amount: number;
  trade_time: string;
};

export type AccumulationHit = {
  symbol: string;
  sector: string | null;
  top5_share: number;
  atr_pct: number;
  total_volume: number;
  top_brokers: number[];
};
