import { COMPANY_CATALOG } from "../ai/agentEngine";
import type {
  Holding,
  PortfolioAction,
  PortfolioHoldingEvaluation,
  PortfolioAiHealthReport,
  PortfolioAiScanResult,
  PortfolioUrgency,
} from "./types";

export type MarketQuote = {
  symbol: string;
  ltp: number;
  change?: number;
  pct_change?: number;
  volume?: number;
  turnover?: number;
  high_52w?: number;
  low_52w?: number;
  rsi_14?: number;
  sma_20?: number;
  sma_50?: number;
  sma_200?: number;
  top3_broker_accum_15d_pct?: number;
  pe?: number;
  pbv?: number;
};

// Heuristic fallback quotes if screener/live data is unavailable
const FALLBACK_QUOTES: Record<string, Partial<MarketQuote>> = {
  NABIL: { ltp: 585, pct_change: 0.68, rsi_14: 56.4, sma_20: 575, sma_50: 560, sma_200: 540, high_52w: 690, low_52w: 480, top3_broker_accum_15d_pct: 44 },
  SHIVM: { ltp: 492, pct_change: -1.2, rsi_14: 42.1, sma_20: 510, sma_50: 525, sma_200: 505, high_52w: 680, low_52w: 430, top3_broker_accum_15d_pct: 32 },
  CHCL: { ltp: 512, pct_change: 1.58, rsi_14: 64.2, sma_20: 495, sma_50: 480, sma_200: 450, high_52w: 580, low_52w: 410, top3_broker_accum_15d_pct: 48 },
  UPPER: { ltp: 218, pct_change: -0.45, rsi_14: 36.8, sma_20: 224, sma_50: 235, sma_200: 250, high_52w: 340, low_52w: 195, top3_broker_accum_15d_pct: 22 },
  HDL: { ltp: 1420, pct_change: 2.15, rsi_14: 71.5, sma_20: 1360, sma_50: 1310, sma_200: 1240, high_52w: 1580, low_52w: 1100, top3_broker_accum_15d_pct: 38 },
  GBIME: { ltp: 214, pct_change: 0.47, rsi_14: 51.0, sma_20: 210, sma_50: 205, sma_200: 198, high_52w: 260, low_52w: 180, top3_broker_accum_15d_pct: 39 },
  NICA: { ltp: 448, pct_change: -0.88, rsi_14: 38.5, sma_20: 460, sma_50: 480, sma_200: 520, high_52w: 620, low_52w: 390, top3_broker_accum_15d_pct: 28 },
  CIT: { ltp: 2280, pct_change: 0.88, rsi_14: 58.2, sma_20: 2220, sma_50: 2160, sma_200: 2050, high_52w: 2600, low_52w: 1900, top3_broker_accum_15d_pct: 46 },
};

export function evaluatePortfolioHolding(
  holding: Holding,
  totalPortfolioValue: number,
  quotesMap: Record<string, MarketQuote> = {}
): PortfolioHoldingEvaluation {
  const symbol = holding.symbol.toUpperCase();
  const catalog = COMPANY_CATALOG[symbol] || {
    name: holding.name || symbol,
    sector: holding.sector || "Equities",
  };

  const name = catalog.name;
  const sector = catalog.sector;
  const qty = Number(holding.qty || 0);
  const wacc = Number(holding.wacc || 0);
  
  // Resolve current market price
  const quote = quotesMap[symbol] || FALLBACK_QUOTES[symbol] || {};
  const ltp = Number(holding.ltp || quote.ltp || wacc || 100);
  const totalCost = Number(holding.total_cost || wacc * qty);
  const marketValue = Number(holding.market_value || ltp * qty);
  const unrealizedPnl = Number(holding.unrealized_pnl || (ltp - wacc) * qty);
  const unrealizedPnlPct = wacc > 0 ? ((ltp - wacc) / wacc) * 100 : 0;
  
  const dayChange = Number(holding.day_change || (quote.pct_change != null ? (ltp * quote.pct_change) / 100 : 0));
  const dayChangePct = quote.pct_change ?? (ltp > 0 && dayChange !== 0 ? (dayChange / ltp) * 100 : 0);
  
  const weightPct = totalPortfolioValue > 0 ? (marketValue / totalPortfolioValue) * 100 : 100;

  // Technical data points
  const rsi = Number(quote.rsi_14 ?? 52);
  const sma20 = Number(quote.sma_20 ?? ltp * 0.98);
  const sma50 = Number(quote.sma_50 ?? ltp * 0.95);
  const sma200 = Number(quote.sma_200 ?? ltp * 0.92);
  const accumPct = Number(quote.top3_broker_accum_15d_pct ?? 35);
  const high52 = Number(quote.high_52w ?? ltp * 1.25);
  const low52 = Number(quote.low_52w ?? ltp * 0.75);

  const isNear52wHigh = high52 > low52 && (ltp - low52) / (high52 - low52) > 0.88;
  const isNear52wLow = high52 > low52 && (ltp - low52) / (high52 - low52) < 0.20;
  const isAbove200Sma = ltp >= sma200;
  const isAboveShortSma = ltp >= sma20 && ltp >= sma50;

  // Determine Concentration Risk
  const concentrationRisk: "safe" | "moderate" | "high" =
    weightPct > 35 ? "high" : weightPct > 20 ? "moderate" : "safe";

  // RSI Condition
  const rsiCondition: "oversold" | "neutral" | "overbought" | "divergence" =
    rsi >= 70 ? "overbought" : rsi <= 35 ? "oversold" : "neutral";

  const smaPosition = isAboveShortSma && isAbove200Sma
    ? "Above 20, 50 & 200 SMA (Strong Bullish Trend)"
    : isAbove200Sma
    ? "Above 200 SMA (Primary Bullish, Secondary Pullback)"
    : "Below 200 SMA (Bearish Secondary Trend)";

  // --- DECISION RULES FOR PORTFOLIO HOLDINGS ---
  let action: PortfolioAction = "WAIT";
  let urgency: PortfolioUrgency = "MONITOR";
  let confidenceScore = 80;
  let primaryReason = "";
  let detailedAnalysis = "";

  const actionPlan: PortfolioHoldingEvaluation["actionPlan"] = {
    actionHeadline: "",
    suggestedAction: "",
  };

  // Rule 1: High Concentration Risk Trigger
  if (concentrationRisk === "high") {
    action = "SELL";
    urgency = "IMMEDIATE";
    confidenceScore = 88;
    primaryReason = `Heavy Concentration Risk: ${symbol} represents ${weightPct.toFixed(1)}% of your total portfolio.`;
    detailedAnalysis = `Holding more than 30-35% in a single scrip exposes your entire capital to idiosyncratic stock risk. Trimming 25-40% of this position frees liquidity to diversify across non-correlated NEPSE sectors.`;
    
    const suggestedTrimQty = Math.max(10, Math.floor(qty * 0.3));
    actionPlan.actionHeadline = "Trim position to restore balance";
    actionPlan.suggestedAction = `Sell ~${suggestedTrimQty.toLocaleString()} units to reduce exposure below 20% weight.`;
    actionPlan.suggestedTrimQty = suggestedTrimQty;
    actionPlan.potentialProceeds = Math.round(suggestedTrimQty * ltp);
    actionPlan.stopLossPrice = Math.round(ltp * 0.94);
  }
  // Rule 2: Take Profit on Overheated Winners
  else if (unrealizedPnlPct >= 25 && (rsi >= 68 || isNear52wHigh)) {
    action = "SELL";
    urgency = rsi >= 74 ? "IMMEDIATE" : "ON_CONFIRMATION";
    confidenceScore = rsi >= 74 ? 92 : 85;
    primaryReason = `Lock in +${unrealizedPnlPct.toFixed(1)}% Gains: Extended momentum with RSI at ${rsi.toFixed(1)} (Overbought).`;
    detailedAnalysis = `Position is sitting on strong profit (+NPR ${Math.round(unrealizedPnl).toLocaleString()}). Price is approaching heavy resistance near the 52-week peak. Locking in 40-50% profit secures capital while letting the remaining balance run with a trailing stop.`;
    
    const suggestedTrim = Math.max(10, Math.floor(qty * 0.5));
    actionPlan.actionHeadline = "Take partial profit (50% lot)";
    actionPlan.suggestedAction = `Sell ~${suggestedTrim.toLocaleString()} units around Rs. ${ltp} to lock in net profit.`;
    actionPlan.targetPrice = Math.round(ltp * 1.05);
    actionPlan.stopLossPrice = Math.round(ltp * 0.95);
    actionPlan.suggestedTrimQty = suggestedTrim;
    actionPlan.potentialProceeds = Math.round(suggestedTrim * ltp);
    actionPlan.cgtEstimate = "5% if held > 365 days, 7.5% if held <= 365 days";
  }
  // Rule 3: Stop Loss / Cut Losers Breaking Key Support
  else if (unrealizedPnlPct <= -9 && !isAbove200Sma && accumPct < 30) {
    action = "SELL";
    urgency = "IMMEDIATE";
    confidenceScore = 89;
    primaryReason = `Capital Protection Alert: Down ${unrealizedPnlPct.toFixed(1)}% and broken below 200 SMA support.`;
    detailedAnalysis = `Holding is in a declining trajectory below its long-term moving average with institutional selling detected (${accumPct.toFixed(1)}% top broker volume). Capital preservation rule: exit before losses compound into a protracted drawdown.`;
    
    actionPlan.actionHeadline = "Exit to preserve remaining capital";
    actionPlan.suggestedAction = `Sell entire or major position at market/limit around Rs. ${ltp}. Re-deploy into leading sectors.`;
    actionPlan.suggestedTrimQty = qty;
    actionPlan.potentialProceeds = Math.round(qty * ltp);
    actionPlan.stopLossPrice = Math.round(ltp * 0.98);
  }
  // Rule 4: High Conviction BUY MORE (Averaging down on quality dip)
  else if (
    unrealizedPnlPct <= -3 &&
    unrealizedPnlPct >= -18 &&
    (rsi <= 40 || isNear52wLow || accumPct >= 42) &&
    weightPct < 22
  ) {
    action = "BUY_MORE";
    urgency = "ON_CONFIRMATION";
    confidenceScore = 87;
    primaryReason = `Prime Accumulation Zone: Down ${Math.abs(unrealizedPnlPct).toFixed(1)}% from WACC, testing deep support with broker accumulation.`;
    detailedAnalysis = `Current price of Rs. ${ltp} offers an asymmetric risk/reward entry below your cost basis (Rs. ${wacc.toFixed(1)}). Top brokers are absorbing supply (${accumPct.toFixed(1)}% accumulation) and RSI is oversold at ${rsi.toFixed(1)}. Adding here significantly lowers your portfolio WACC.`;
    
    const addQty = Math.max(10, Math.floor(qty * 0.5));
    actionPlan.actionHeadline = "Average down & lower WACC";
    actionPlan.suggestedAction = `Accumulate ~${addQty.toLocaleString()} units between Rs. ${Math.round(ltp * 0.97)} - Rs. ${Math.round(ltp * 1.02)}.`;
    actionPlan.accumulationZone = { min: Math.round(ltp * 0.96), max: Math.round(ltp * 1.02) };
    actionPlan.targetPrice = Math.round(wacc * 1.15);
    actionPlan.stopLossPrice = Math.round(ltp * 0.92);
  }
  // Rule 5: Pyramiding BUY MORE on Strong Breakout
  else if (
    unrealizedPnlPct >= 4 &&
    unrealizedPnlPct <= 16 &&
    isAboveShortSma &&
    rsi >= 52 &&
    rsi <= 66 &&
    accumPct >= 40 &&
    weightPct < 25
  ) {
    action = "BUY_MORE";
    urgency = "ON_CONFIRMATION";
    confidenceScore = 84;
    primaryReason = `Pyramiding Opportunity: In profit (+${unrealizedPnlPct.toFixed(1)}%), riding bullish momentum with institutional backing.`;
    detailedAnalysis = `Price is comfortably above short-term EMAs with clean momentum (RSI ${rsi.toFixed(1)}). Top broker desks are net buyers (${accumPct.toFixed(1)}% absorption). Adding to winning positions (pyramiding) compounds gains in active trends.`;
    
    const addQty = Math.max(10, Math.floor(qty * 0.35));
    actionPlan.actionHeadline = "Scale into winning trend";
    actionPlan.suggestedAction = `Add ~${addQty.toLocaleString()} units on minor intraday pullbacks near Rs. ${Math.round(ltp * 0.99)}.`;
    actionPlan.accumulationZone = { min: Math.round(ltp * 0.98), max: Math.round(ltp * 1.01) };
    actionPlan.targetPrice = Math.round(ltp * 1.20);
    actionPlan.stopLossPrice = Math.round(sma20);
  }
  // Rule 6: WAIT / HOLD (Healthy Uptrend with Trailing Stop)
  else if (unrealizedPnlPct >= 5 && isAboveShortSma) {
    action = "WAIT";
    urgency = "MONITOR";
    confidenceScore = 86;
    primaryReason = `Ride Intact Bullish Trend: Up +${unrealizedPnlPct.toFixed(1)}% with healthy RSI (${rsi.toFixed(1)}). Hold with trailing stop.`;
    detailedAnalysis = `Position is performing well and moving cleanly above moving averages. Do not cut winning trades prematurely. Hold your position and allow upside to develop while moving your stop-loss up to protect accrued profit.`;
    
    const trailingStop = Math.max(wacc, Math.round(ltp * 0.93));
    actionPlan.actionHeadline = "Hold position & trail stop-loss";
    actionPlan.suggestedAction = `Set mental/broker stop at Rs. ${trailingStop}. Target exit near Rs. ${Math.round(ltp * 1.15)}.`;
    actionPlan.stopLossPrice = trailingStop;
    actionPlan.targetPrice = Math.round(ltp * 1.15);
  }
  // Rule 7: WAIT / HOLD (Consolidation & Reversal Watch)
  else {
    action = "WAIT";
    urgency = "MONITOR";
    confidenceScore = 78;
    primaryReason = `Consolidation Phase: Price hovering near WACC (PnL ${unrealizedPnlPct >= 0 ? "+" : ""}${unrealizedPnlPct.toFixed(1)}%). Patience advised.`;
    detailedAnalysis = `The stock is moving in a range-bound channel with neutral momentum (RSI ${rsi.toFixed(1)}). There are no decisive breakout or breakdown signals yet. Maintain current position and wait for clear institutional volume triggers before adding or exiting.`;
    
    actionPlan.actionHeadline = "Patiently hold & monitor";
    actionPlan.suggestedAction = `Maintain position. Do not overtrade. Re-evaluate on break of Rs. ${Math.round(ltp * 1.06)} (buy) or Rs. ${Math.round(ltp * 0.94)} (cut).`;
    actionPlan.targetPrice = Math.round(ltp * 1.10);
    actionPlan.stopLossPrice = Math.round(ltp * 0.94);
  }

  return {
    symbol,
    name,
    sector,
    qty,
    wacc,
    ltp,
    totalCost,
    marketValue,
    unrealizedPnl,
    unrealizedPnlPct,
    dayChange,
    dayChangePct,
    weightPct,
    action,
    confidenceScore,
    urgency,
    primaryReason,
    detailedAnalysis,
    signals: {
      pnlStatus: `${unrealizedPnlPct >= 0 ? "+" : ""}${unrealizedPnlPct.toFixed(1)}% (NPR ${unrealizedPnl >= 0 ? "+" : ""}${Math.round(unrealizedPnl).toLocaleString()})`,
      trendRegime: isAboveShortSma ? "bullish" : isAbove200Sma ? "neutral" : "bearish",
      rsi,
      rsiCondition,
      smaPosition,
      brokerAccumulationPct: accumPct,
      concentrationRisk,
    },
    actionPlan,
  };
}

export function generatePortfolioHealthReport(
  evaluations: PortfolioHoldingEvaluation[]
): PortfolioAiHealthReport {
  if (evaluations.length === 0) {
    return {
      overallHealthScore: 100,
      riskProfile: "Balanced Moderate",
      executiveBrief: "Your portfolio is currently clean with no active positions. Add your transactions to receive customized AI sell, wait, or buy alerts.",
      tacticalAdvice: "Consider diversifying across commercial banks, hydropower leaders, and manufacturing blue-chips.",
      actionCounts: { buyMore: 0, wait: 0, sell: 0, total: 0 },
      sectorDiversification: [],
      evaluatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  }

  const totalValue = evaluations.reduce((acc, h) => acc + h.marketValue, 0);
  const totalCost = evaluations.reduce((acc, h) => acc + h.totalCost, 0);
  const overallPnlPct = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

  let buyMore = 0;
  let wait = 0;
  let sell = 0;

  evaluations.forEach((e) => {
    if (e.action === "BUY_MORE") buyMore++;
    else if (e.action === "SELL") sell++;
    else wait++;
  });

  // Calculate sector weights
  const sectorMap: Record<string, number> = {};
  evaluations.forEach((e) => {
    sectorMap[e.sector] = (sectorMap[e.sector] || 0) + e.marketValue;
  });

  const sectorDiversification = Object.entries(sectorMap)
    .map(([sector, value]) => ({
      sector,
      value,
      weightPct: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.weightPct - a.weightPct);

  // Health Score Calculation (0 to 100)
  let healthScore = 75;

  // Penalty for overconcentration (> 35% in one stock or > 50% in one sector)
  const maxStockWeight = Math.max(...evaluations.map((e) => e.weightPct));
  if (maxStockWeight > 45) healthScore -= 18;
  else if (maxStockWeight > 30) healthScore -= 10;

  const maxSectorWeight = sectorDiversification[0]?.weightPct ?? 0;
  if (maxSectorWeight > 60) healthScore -= 12;

  // Bonus for overall profitability
  if (overallPnlPct > 15) healthScore += 12;
  else if (overallPnlPct > 5) healthScore += 6;
  else if (overallPnlPct < -10) healthScore -= 14;

  // Bonus for diversification (3+ stocks, 2+ sectors)
  if (evaluations.length >= 4 && sectorDiversification.length >= 3) healthScore += 10;
  else if (evaluations.length === 1) healthScore -= 10;

  healthScore = Math.max(25, Math.min(98, healthScore));

  // Determine Risk Profile
  let riskProfile: PortfolioAiHealthReport["riskProfile"] = "Balanced Moderate";
  if (maxSectorWeight > 65 || maxStockWeight > 45) {
    riskProfile = "High Volatility";
  } else if (evaluations.every((e) => e.sector === "Commercial Banks" || e.sector === "Investment")) {
    riskProfile = "Defensive & Income";
  } else if (evaluations.some((e) => e.sector === "Hydropower" || e.sector === "Manufacturing & Processing")) {
    riskProfile = "Aggressive Growth";
  }

  // Executive Brief
  let executiveBrief = "";
  if (sell > 0 && buyMore > 0) {
    executiveBrief = `Tactical Rebalancing Required: The AI agent detected ${sell} holding(s) ripe for profit-taking or stop-loss trimming, alongside ${buyMore} high-conviction opportunity to average down or scale up.`;
  } else if (sell > 0) {
    executiveBrief = `Capital Preservation & Profit Taking: You have ${sell} position(s) that have hit overbought profit targets or broken key risk thresholds. Consider locking in gains.`;
  } else if (buyMore > 0) {
    executiveBrief = `Favorable Accumulation Environment: ${buyMore} of your holdings are currently hovering in asymmetric risk-reward buy zones with broker support.`;
  } else {
    executiveBrief = `Steady Momentum & Patience: All ${wait} of your current holdings are well within acceptable trend parameters. No immediate liquidation or forced averaging is warranted.`;
  }

  // Tactical Advice
  const tacticalAdvice =
    sell > 0
      ? `Review the Sell/Trim recommendations first. Re-allocating capital from overextended positions into your highest-conviction holdings will de-risk your overall account.`
      : `Continue trailing stops on your winning positions while maintaining adequate cash reserves for sector rotation.`;

  return {
    overallHealthScore: healthScore,
    riskProfile,
    executiveBrief,
    tacticalAdvice,
    actionCounts: {
      buyMore,
      wait,
      sell,
      total: evaluations.length,
    },
    sectorDiversification,
    evaluatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

export function scanPortfolio(
  holdings: Holding[],
  quotesMap: Record<string, MarketQuote> = {}
): PortfolioAiScanResult {
  const totalValue = holdings.reduce((sum, h) => {
    const quote = quotesMap[h.symbol.toUpperCase()] || FALLBACK_QUOTES[h.symbol.toUpperCase()];
    const price = Number(h.ltp || quote?.ltp || h.wacc || 100);
    return sum + price * Number(h.qty || 0);
  }, 0);

  const evaluations = holdings.map((h) => evaluatePortfolioHolding(h, totalValue, quotesMap));
  const report = generatePortfolioHealthReport(evaluations);

  return { report, evaluations };
}

// Portfolio Chat Assistant
export function answerPortfolioAgentQuery(
  query: string,
  scan: PortfolioAiScanResult
): string {
  const q = query.toLowerCase();
  const { report, evaluations } = scan;

  if (evaluations.length === 0) {
    return "Your portfolio currently has no active holdings. Once you add transactions or load a sample portfolio, I can analyze your exact WACCs, gains, and provide personalized Buy/Wait/Sell guidance!";
  }

  // Check if query is asking about a specific symbol
  const matchedHolding = evaluations.find(
    (e) => q.includes(e.symbol.toLowerCase()) || q.includes(e.name.toLowerCase())
  );

  if (matchedHolding) {
    const { symbol, action, urgency, primaryReason, detailedAnalysis, actionPlan, signals, wacc, ltp, qty, unrealizedPnlPct } = matchedHolding;
    const actionLabel = action === "BUY_MORE" ? "🟢 BUY MORE" : action === "SELL" ? "🔴 SELL / TRIM" : "🟡 WAIT / HOLD";
    
    return `### AI Recommendation for ${symbol} (${matchedHolding.name})

**Verdict**: **${actionLabel}** (Urgency: ${urgency}, Confidence: ${matchedHolding.confidenceScore}%)

**Your Position**:
- **Holding**: ${qty.toLocaleString()} units @ WACC of Rs. ${wacc.toFixed(1)}
- **Current LTP**: Rs. ${ltp} (${unrealizedPnlPct >= 0 ? "+" : ""}${unrealizedPnlPct.toFixed(1)}% return)
- **Portfolio Weight**: ${matchedHolding.weightPct.toFixed(1)}% of total capital

**Core Rationale**:
${primaryReason}

**Detailed Breakdown**:
${detailedAnalysis}

**Tactical Plan**:
- **Suggested Action**: ${actionPlan.suggestedAction}
${actionPlan.targetPrice ? `- **Target Exit Level**: Rs. ${actionPlan.targetPrice}\n` : ""}${actionPlan.stopLossPrice ? `- **Stop Loss / Capital Protection**: Rs. ${actionPlan.stopLossPrice}\n` : ""}${actionPlan.accumulationZone ? `- **Accumulation Zone**: Rs. ${actionPlan.accumulationZone.min} - Rs. ${actionPlan.accumulationZone.max}\n` : ""}
*Signal Confluence: Trend is ${signals.trendRegime.toUpperCase()}, RSI at ${signals.rsi.toFixed(1)} (${signals.rsiCondition}), Broker accumulation: ${signals.brokerAccumulationPct?.toFixed(1) ?? "35"}%.*`;
  }

  // Should I sell anything?
  if (q.includes("sell") || q.includes("exit") || q.includes("profit") || q.includes("loss")) {
    const sellHoldings = evaluations.filter((e) => e.action === "SELL");
    if (sellHoldings.length === 0) {
      return `### Portfolio AI Sell Analysis
Good news: None of your current holdings have triggered a mandatory **SELL** signal!
All positions are either maintaining steady bullish trends or sitting in healthy accumulation channels. Continue holding with trailing stop-losses.`;
    }

    return `### Portfolio AI Sell Recommendations
The AI Agent advises trimming or exiting **${sellHoldings.length} holding(s)**:

${sellHoldings.map((h) => `- **${h.symbol}** (${h.unrealizedPnlPct >= 0 ? "+" : ""}${h.unrealizedPnlPct.toFixed(1)}%): ${h.primaryReason}\n  *Action*: ${h.actionPlan.suggestedAction}`).join("\n\n")}

Locking in profits or cutting broken support protects your capital and generates dry powder for the next sector opportunity.`;
  }

  // What to buy more?
  if (q.includes("buy") || q.includes("add") || q.includes("accumulate") || q.includes("average")) {
    const buyHoldings = evaluations.filter((e) => e.action === "BUY_MORE");
    if (buyHoldings.length === 0) {
      return `### Portfolio AI Accumulation Advisory
Currently, none of your existing holdings are in an aggressive **BUY MORE** state. Most are either extended or consolidating. We suggest waiting for healthy pullbacks near the 20/50 day moving averages rather than chasing prices.`;
    }

    return `### Prime Accumulation Candidates in Your Portfolio
The AI Agent flags **${buyHoldings.length} holding(s)** as ideal for adding or averaging:

${buyHoldings.map((h) => `- **${h.symbol}** (${h.unrealizedPnlPct >= 0 ? "+" : ""}${h.unrealizedPnlPct.toFixed(1)}%): ${h.primaryReason}\n  *Zone*: Rs. ${h.actionPlan.accumulationZone?.min ?? h.ltp} - Rs. ${h.actionPlan.accumulationZone?.max ?? h.ltp}`).join("\n\n")}`;
  }

  // General health / rebalance
  return `### Portfolio Health & Advisory Overview

**Overall Health Score**: **${report.overallHealthScore}/100** (${report.riskProfile})

**AI Action Summary**:
- 🟢 **Buy More**: ${report.actionCounts.buyMore} stock(s)
- 🟡 **Wait / Hold**: ${report.actionCounts.wait} stock(s)
- 🔴 **Sell / Trim**: ${report.actionCounts.sell} stock(s)

**Executive Guidance**:
${report.executiveBrief}

**Sector Diversification**:
${report.sectorDiversification.map((s) => `- ${s.sector}: ${s.weightPct.toFixed(1)}% (NPR ${Math.round(s.value).toLocaleString()})`).join("\n")}

*Ask me about any specific stock (e.g. "Should I sell NABIL?", "What is my stop loss for CHCL?") for an immediate in-depth tactical plan!*`;
}
