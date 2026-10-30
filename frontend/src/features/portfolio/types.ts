// Money fields arrive as decimal strings or numbers; format them, don't do raw string arithmetic.
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
  // Extended fields for rich view
  name?: string;
  sector?: string;
  unrealized_pnl_pct?: number;
  day_change_pct?: number;
  weight_pct?: number;
};

export type Txn = {
  id: number | string;
  symbol: string;
  txn_type: TxnType;
  qty: number;
  rate: Money;
  txn_date: string;
  fees: Record<string, Money>;
  investor_type?: InvestorType;
  total_payable?: Money;
  net_receivable?: Money;
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

// --- AI PORTFOLIO AGENT TYPES ---
export type PortfolioAction = "BUY_MORE" | "WAIT" | "SELL";
export type PortfolioUrgency = "IMMEDIATE" | "ON_CONFIRMATION" | "MONITOR";

export type PortfolioHoldingEvaluation = {
  symbol: string;
  name: string;
  sector: string;
  qty: number;
  wacc: number;
  ltp: number;
  totalCost: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  dayChange: number;
  dayChangePct: number;
  weightPct: number;

  // AI Decision
  action: PortfolioAction;
  confidenceScore: number; // 0 - 100
  urgency: PortfolioUrgency;
  primaryReason: string;
  detailedAnalysis: string;

  // Signal breakdown
  signals: {
    pnlStatus: string;
    trendRegime: "bullish" | "neutral" | "bearish";
    rsi: number;
    rsiCondition: "oversold" | "neutral" | "overbought" | "divergence";
    smaPosition: string;
    brokerAccumulationPct?: number;
    concentrationRisk: "safe" | "moderate" | "high";
  };

  // Tactical Execution Plan
  actionPlan: {
    actionHeadline: string;
    suggestedAction: string;
    targetPrice?: number;
    stopLossPrice?: number;
    accumulationZone?: { min: number; max: number };
    suggestedTrimQty?: number;
    potentialProceeds?: number;
    cgtEstimate?: string;
  };
};

export type PortfolioAiHealthReport = {
  overallHealthScore: number; // 0 - 100
  riskProfile: "Defensive & Income" | "Balanced Moderate" | "Aggressive Growth" | "High Volatility";
  executiveBrief: string;
  tacticalAdvice: string;
  actionCounts: {
    buyMore: number;
    wait: number;
    sell: number;
    total: number;
  };
  sectorDiversification: {
    sector: string;
    weightPct: number;
    value: number;
  }[];
  evaluatedAt: string;
};

export type PortfolioAiScanResult = {
  report: PortfolioAiHealthReport;
  evaluations: PortfolioHoldingEvaluation[];
};
