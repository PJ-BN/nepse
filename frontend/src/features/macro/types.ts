export type Point = { date: string; value: number };

export type Regime = {
  score: number; // 0-100, higher = easier liquidity
  regime: "BULLISH" | "NEUTRAL" | "BEARISH";
  cd_ratio: number;
  interbank_rate: number;
  cd_roc_30d: number | null;
  interbank_roc_30d: number | null;
};

export type MacroRadar = {
  nepse: Point[];
  series: Partial<Record<
    | "cd_ratio"
    | "interbank_rate"
    | "deposits_total"
    | "lending_total"
    | "base_rate"
    | "fx_reserves_npr_bn"
    | "fx_reserves_usd_mn"
    | "excess_liquidity",
    Point[]
  >>;
  regime: Regime | null;
};

export type RrgPoint = { date: string; rs_ratio: number; rs_momentum: number };
export type Quadrant = "Leading" | "Weakening" | "Lagging" | "Improving";
export type RrgSector = { code: string; name: string; quadrant: Quadrant; tail: RrgPoint[] };
export type Rrg = { benchmark: string; timeframe: "daily" | "weekly"; window: number; sectors: RrgSector[] };

export type Issue = {
  company: string;
  issue_type: "IPO" | "RIGHT";
  stage: "PIPELINE" | "APPROVED";
  sector: string | null;
  units: number | null;
  amount: number | null;
  issue_manager: string | null;
  application_date_bs: string | null;
  approval_date_bs: string | null;
  as_of_bs: string | null;
  source_url: string | null;
};

export type Breadth = {
  as_of: string;
  advances: number;
  declines: number;
  unchanged: number;
  mcclellan: number | null;
  pct_above: { sma_20: number | null; sma_50: number | null; sma_200: number | null };
  series: { date: string; advances: number; declines: number; net: number; mcclellan: number | null }[];
};
