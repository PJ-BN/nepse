// Mirrors POST /api/v1/simulation/run (plan: "Indicator simulator", section 3).
export type OperandJson = number | { ind: string; [param: string]: string | number };
export type ConditionJson = { left: OperandJson; op: string; right: OperandJson };
export type RulesJson = { and: ConditionJson[] } | { or: ConditionJson[] };

export type SimulationRequest = {
  symbol: string;
  anchor_date: string;
  rules: RulesJson;
  horizons: number[];
  target_pct?: number;
  stop_pct?: number;
  cost_pct?: number;
  events_from?: string;
};

// All returns, MFE/MAE and stats returns are in percent; win_rate is a 0..1 fraction.
export type Bar = { t: string; o: number | null; h: number | null; l: number | null; c: number | null; v: number };

export type IndicatorSeries = {
  name: string; // e.g. "sma(5)", "macd(12,26,9).hist"
  pane: "price" | "oscillator";
  values: (number | null)[]; // aligned with bars
};

export type HorizonResult = { horizon: number; ret: number | null; mfe: number | null; mae: number | null };

export type Bracket = { outcome: "target" | "stop" | "neither" | "open"; bars: number | null; ret: number | null };

export type ConditionState = {
  left: string;
  op: string;
  right: string;
  left_value: number | null;
  right_value: number | null;
  met: boolean;
};

export type SimulationEvent = {
  date: string;
  entry_date: string;
  entry_price: number | null;
  results: HorizonResult[];
  bracket: Bracket | null;
};

export type HorizonStats = {
  horizon: number;
  count: number;
  win_rate: number | null;
  avg_return: number | null;
  median_return: number | null;
};

export type SimulationResult = {
  symbol: string;
  bars: Bar[];
  indicators: IndicatorSeries[];
  anchor: {
    date: string; // actual bar used (last on or before requested_date)
    requested_date: string;
    fired: boolean;
    conditions: ConditionState[];
    values: Record<string, number | null>;
  };
  forward: {
    entry_date: string;
    entry_price: number | null;
    path: { t: string; ret: number | null }[];
    results: HorizonResult[];
    bracket: Bracket | null;
  } | null;
  events: SimulationEvent[];
  stats: { events: number; horizons: HorizonStats[] };
  warnings: string[];
};
