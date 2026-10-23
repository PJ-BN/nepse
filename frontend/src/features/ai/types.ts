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

export type ChartAiArticle = {
  why_tools_used: string;
  what_chart_says: string;
  what_to_do: string;
  risk_factors: string[];
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
  evaluated_at: string;
  source: "agy" | "heuristic";
};
