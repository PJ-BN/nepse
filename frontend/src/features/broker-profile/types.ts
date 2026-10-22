// Mirrors BrokerProfile in backend/src/nepse/application/floorsheet/analytics.py.
export type StockAccumulation = {
  symbol: string;
  sector: string | null;
  net_qty: number;
  net_amt: number;
  buy_vwap: number | null;
};

export type ProfileWindow = {
  label: "today" | "week" | "month";
  days: number;
  from_day: string | null;
  top_stocks: StockAccumulation[];
  sectors: Record<string, number>;
};

export type BrokerProfile = { broker: number; windows: ProfileWindow[] };
