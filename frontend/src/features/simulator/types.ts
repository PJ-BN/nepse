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

export type Bar = { t: string; o: number; h: number; l: number; c: number; v: number };

export type IndicatorSeries = {
  key: string;
  label: string;
  pane: "price" | "oscillator";
  values: (number | null)[]; // aligned with bars
};

export type Bracket = "target" | "stop" | "neither";

export type HorizonResult = {
  horizon: number;
  return_pct: number | null; // null when the window runs past the last bar
  mfe_pct: number | null;
  mae_pct: number | null;
};

export type ConditionResult = { label: string; value: boolean };

export type SimulationEvent = {
  date: string;
  results: HorizonResult[];
  bracket: Bracket | null;
};

export type HorizonStats = {
  horizon: number;
  n: number;
  win_rate: number | null;
  avg_return_pct: number | null;
  median_return_pct: number | null;
};

export type SimulationResult = {
  bars: Bar[];
  indicators: IndicatorSeries[];
  anchor: {
    date: string; // actual bar used (last on or before the requested date)
    fired: boolean;
    conditions: ConditionResult[];
    values: Record<string, number | null>;
  };
  forward: {
    entry_date: string | null;
    entry_price: number | null;
    results: HorizonResult[];
    bracket: Bracket | null;
  };
  events: SimulationEvent[];
  stats: { count: number; horizons: HorizonStats[] };
  warnings: string[];
};
