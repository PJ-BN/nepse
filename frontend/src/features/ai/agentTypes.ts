export type AgentAction = "BUY" | "WATCHLIST" | "SELL";

export type UrgencyLevel = "IMMEDIATE" | "ON_CONFIRMATION" | "MONITOR";

export type TradeSetup = {
  entryMin: number;
  entryMax: number;
  stopLoss: number;
  riskPct: number;
  target1: number;
  target1UpsidePct: number;
  target2: number;
  target2UpsidePct: number;
  target3?: number;
  target3UpsidePct?: number;
  riskReward: string; // e.g. "1:2.8"
  timeframe: string; // e.g. "Swing (1-3 weeks)"
  triggerCondition?: string;
};

export type StockCatalyst = {
  type: "dividend" | "earnings" | "broker_flow" | "breakout" | "divergence" | "agm" | "rights" | "news";
  headline: string;
  impact: "bullish" | "neutral" | "bearish";
  date?: string;
  url?: string;
};

export type SignalBreakdown = {
  technicalTrend: "bullish" | "neutral" | "bearish";
  smartMoneyFlow: "accumulating" | "neutral" | "distributing";
  valuation: "undervalued" | "fair" | "overvalued";
  newsSentiment: "positive" | "neutral" | "cautious";
};

export type StockAgentEvaluation = {
  symbol: string;
  name: string;
  sector: string;
  close: number;
  changePct: number;
  volume: number;
  turnover: number;
  marketCap?: number;

  // Decision & Reasoning
  action: AgentAction;
  confidenceScore: number; // 0 - 100
  urgency: UrgencyLevel;
  headlineReason: string;
  detailedAnalysis: string;

  // Technical & Quant Metrics
  rsi14: number;
  rsiBullDiv: boolean;
  smaPosition: "ABOVE_ALL" | "ABOVE_20_50" | "ABOVE_200" | "BELOW_ALL" | "MIXED";
  range52wPct: number; // 0 to 100%
  high52w: number;
  low52w: number;
  brokerAccumulationPct: number; // top 3 broker accumulation %
  pe?: number;
  pbv?: number;
  grahamNumber?: number;
  eps?: number;

  // Execution Plan
  tradePlan?: TradeSetup;

  // Catalysts & News
  catalysts: StockCatalyst[];
  signals: SignalBreakdown;
};

export type MarketAgentBriefing = {
  marketRegime: "BULLISH_TREND" | "RANGE_BOUND" | "SELECTIVE_PULLBACK" | "BEARISH_CORRECTION";
  confidenceScore: number;
  totalStocksScanned: number;
  buyCount: number;
  watchlistCount: number;
  sellCount: number;
  executiveBrief: string;
  topSectorPick: string;
  tacticalStrategy: string;
  evaluatedAt: string;
};

export type AgentScanResult = {
  briefing: MarketAgentBriefing;
  stocks: StockAgentEvaluation[];
  topBuys: StockAgentEvaluation[];
  topWatchlist: StockAgentEvaluation[];
  topSells: StockAgentEvaluation[];
  source: "agy" | "heuristic";
};

export type AgentChatMessage = {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: string;
  recommendedSymbols?: string[];
  stocks?: StockAgentEvaluation[];
};
