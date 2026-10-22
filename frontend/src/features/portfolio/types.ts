// Money fields arrive as decimal strings (exact); format them, don't do arithmetic on them.
export type Money = string;
export type TxnType = "BUY" | "SELL" | "BONUS" | "RIGHT" | "IPO";
export type InvestorType = "INDIVIDUAL" | "INSTITUTION";

export type Holding = {
  symbol: string;
  qty: number;
  wacc: Money;
  total_cost: Money;
  ltp: Money | null;
  market_value: Money | null;
  unrealized_pnl: Money | null;
  day_change: Money | null;
};

export type Txn = {
  id: number;
  symbol: string;
  txn_type: TxnType;
  qty: number;
  rate: Money;
  txn_date: string;
  fees: Record<string, Money>;
};

export type TxnInput = {
  symbol: string;
  txn_type: TxnType;
  qty: number;
  rate?: string;
  txn_date: string;
  investor_type: InvestorType;
};

export type RealizedSell = {
  symbol: string;
  sell_date: string;
  qty: number;
  rate: Money;
  amount: Money;
  total_fees: Money;
  cost_basis: Money;
  cgt: Money;
  net_receivable: Money;
  realized_pnl: Money;
};

export type Realized = { total_realized_pnl: Money; total_cgt: Money; sells: RealizedSell[] };

export type CalcInput = {
  side: "BUY" | "SELL";
  qty: number;
  rate: string;
  buy_rate?: string;
  buy_date?: string;
  sell_date?: string;
  investor_type: InvestorType;
};

export type CalcResult = Record<string, Money | number | boolean>;
