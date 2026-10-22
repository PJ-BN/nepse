// Mirrors GET /api/v1/company/{symbol}/full (application/fundamentals/get_company_full.py).

export type Profile = {
  symbol: string;
  name: string;
  sector_code: string | null;
  instrument_type: string;
  listed_shares: number | null;
  public_shares: number | null;
  promoter_shares: number | null;
  promoter_pct: number | null;
  paid_up_capital: number | null;
  listing_date: string | null;
  promoter_lockin_expiry: string | null;
};

export type Quarter = {
  fy_bs: string;
  quarter: number;
  period_end: string;
  paid_up_capital: number | null;
  reserves: number | null;
  net_profit: number | null;
  eps: number | null;
  bvps: number | null;
  total_assets: number | null;
  total_debt: number | null;
  cash: number | null;
  distributable_profit: number | null;
  sector_metrics: Record<string, unknown> | null;
};

export type Flag = { code: string; level: "red" | "green" | "info"; message: string };

export type Valuation = {
  eps: number | null;
  bvps: number | null;
  pe: number | null;
  pb: number | null;
  graham_number: number | null;
  graham_upside_pct: number | null;
  dividend_capacity: number | null;
  market_cap: number | null;
  enterprise_value: number | null;
  ev_ebitda: number | null;
  dcf: { per_share: number; risk_free_rate: number; growth: number; terminal_growth: number; years: number } | null;
  price_to_life_fund: number | null;
  nav: number | null;
  nav_discount_pct: number | null;
};

export type Dividend = {
  fy_bs: string;
  bonus_pct: number;
  cash_pct: number;
  right_ratio: string | null;
  book_closure_date: string | null;
};

export type DepthLevel = { price: number; qty: number; orders: number };
export type Depth = { symbol: string; buy: DepthLevel[]; sell: DepthLevel[]; total_buy_qty: number; total_sell_qty: number; ts: string };

export type CompanyFull = {
  profile: Profile;
  price: { ltp: number | null; source: "live" | "eod" | null; as_of: string | null; high_52w: number | null; low_52w: number | null };
  quote: Record<string, unknown> | null;
  financials: Quarter[];
  sector_metrics: Record<string, unknown> | null;
  flags: Flag[];
  valuation: Valuation;
  dividends: Dividend[];
  depth: Depth | null;
  lockin: { expiry: string | null; days_left: number | null };
};
