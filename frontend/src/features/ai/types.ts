export type PriceRange = {
  min: number;
  max: number;
  target: number;
  outlook: string;
};

export type CompanyAiEvaluation = {
  symbol: string;
  verdict: "BUY NOW" | "WAIT FOR PULLBACK" | "ACCUMULATE ON DIPS" | "HOLD / NEUTRAL" | "AVOID";
  is_best_time: boolean;
  timing_assessment: string;
  wait_reason: string | null;
  short_term_range: PriceRange;
  long_term_range: PriceRange;
  fundamental_score: number; // 0 - 100
  valuation_status: "UNDERVALUED" | "FAIR" | "OVERVALUED";
  strengths: string[];
  risks: string[];
  catalysts: string[];
  summary: string;
  evaluated_at: string;
  source: "agy" | "heuristic";
};

export type MarketAiAnalysis = {
  market_status: "BULLISH" | "MODERATELY BULLISH" | "SIDEWAYS / NEUTRAL" | "BEARISH REVERSAL" | "BEARISH";
  confidence_score: number; // 0 - 100
  confidence_level: "HIGH" | "MODERATE" | "LOW";
  sentiment: string;
  breadth_evaluation: string;
  turnover_evaluation: string;
  key_drivers: string[];
  risks: string[];
  actionable_advice: string;
  summary: string;
  evaluated_at: string;
  source: "agy" | "heuristic";
};

export type ChartAiDrawing = {
  name: string; // "segment" | "horizontalStraightLine" | "horizontalRayLine" | "rect" | "fibonacciLine" | "priceLine"
  label: string;
  points: Array<{ timestamp?: number; value?: number }>;
  color?: string;
  reason: string;
};

export type ChartAiIndicator = {
  type: string; // "sma" | "ema" | "supertrend" | "rsi" | "bb" | "macd" | "atr"
  period: number;
  color: string;
  reason: string;
};

export type NewsAiEvaluation = {
  news_id: number;
  title: string;
  impact_stance: "BULLISH" | "BEARISH" | "NEUTRAL" | "WATCH";
  impact_score: number;
  action_recommendation: string;
  actionable_playbook: string;
  target_horizon: string;
  affected_symbols: string[];
  affected_sectors: string[];
  catalysts: string[];
  risks_to_watch: string[];
  investor_checklist: string[];
  analyzed_at: string;
  source: "agy" | "heuristic";
};

export type QuantLevel = {
  price: number;
  kind: "support" | "resistance";
  touches: number;
  strength: number; // 1-5
  distance_pct: number; // signed vs last close
};

export type QuantSignal = { name: string; bias: -1 | 0 | 1; weight: number; detail: string };

export type ChartQuant = {
  last_close: number;
  bars: number;
  regime: { label: string; adx: number; plus_di: number; minus_di: number; ema_stack: string; ema20: number; sma50: number; sma200: number | null; ext_atr: number };
  structure: { sequence: string; bias: "BULLISH" | "BEARISH" | "RANGE"; last_event: string; last_swing_high: number | null; last_swing_low: number | null };
  momentum: { rsi: number; macd_hist: number; macd_state: string; stoch_k: number; divergence: string };
  volatility: { atr: number; atr_pct: number; bb_width_pctile: number; squeeze: boolean; hist_vol_ann: number; exp_move_5d_pct: number; exp_move_20d_pct: number };
  volume: { rel_vol: number; obv_trend: string; updown_ratio: number; poc: number; va_low: number; va_high: number; note: string };
  levels: QuantLevel[];
  fib: { direction: "UP" | "DOWN"; swing_low: number; swing_high: number; levels: Array<{ ratio: number; price: number }>; ext_1272: number; ext_1618: number } | null;
  patterns: Array<{ name: string; bias: -1 | 0 | 1; date: string }>;
  mtf: Array<{ tf: string; trend: "UP" | "DOWN" | "SIDEWAYS"; rsi: number; detail: string }>;
  range: { high_52w: number; low_52w: number; pos_pct: number; from_high_pct: number };
  signals: QuantSignal[];
  score: number; // -100..100 confluence
  plan: {
    entry_min: number; entry_max: number; stop: number; targets: [number, number, number];
    rr: [number, number, number]; risk_pct: number; shares_per_10k_risk: number; trigger: string;
  };
  scenarios: Array<{ name: string; probability: number; target: number; trigger: string }>;
};

export type ChartAiArticle = {
  why_tools_used: string;
  what_chart_says: string;
  what_to_do: string;
  risk_factors: string[];
  executive_summary?: string;
  market_structure?: string;
  momentum_volatility?: string;
  volume_analysis?: string;
  multi_timeframe?: string;
};

export type ChartAiAnalysis = {
  symbol: string;
  timeframe: string;
  title: string;
  stance: "STRONG BULLISH" | "BULLISH BREAKOUT" | "BULLISH" | "NEUTRAL / ACCUMULATION" | "BEARISH" | "REVERSAL WATCH";
  confidence_score: number; // 0 - 100
  action: "BUY ON PULLBACK" | "BUY BREAKOUT" | "HOLD / ACCUMULATE" | "TAKE PROFIT" | "WAIT / AVOID";
  entry_zone: { min: number; max: number };
  targets: Array<{ label: string; price: number; upside_pct?: number }>;
  stop_loss: { price: number; risk_pct?: number };
  risk_reward_ratio: string;
  recommended_indicators: ChartAiIndicator[];
  recommended_drawings: ChartAiDrawing[];
  article: ChartAiArticle;
  quant?: ChartQuant;
  evaluated_at: string;
  source: "agy" | "heuristic";
};
