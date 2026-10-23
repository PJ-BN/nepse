import { execFile } from "child_process";
import type { ChartAiAnalysis, ChartAiDrawing, ChartAiIndicator, CompanyAiEvaluation, MarketAiAnalysis } from "./types";

function cleanJson(raw: string): string {
  let cleaned = raw.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  // Extract JSON object bounds if there is surrounding chatter
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

export async function runAgyPrompt(prompt: string, timeoutMs = 60000): Promise<string> {
  // 1. Try invoking local agy binary directly (when running on host)
  try {
    return await new Promise<string>((resolve, reject) => {
      execFile(
        "agy",
        ["--dangerously-skip-permissions", `--print=${prompt}`],
        { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error) {
            return reject(new Error(`AGY local execution failed: ${error.message}${stderr ? ` - ${stderr}` : ""}`));
          }
          resolve(stdout);
        }
      );
    });
  } catch (localErr: unknown) {
    // 2. If agy binary is not on PATH (e.g. inside Docker container), delegate to the host bridge
    const bridgeUrl = process.env.AGY_BRIDGE_URL || "http://host.docker.internal:4141";
    try {
      const resp = await fetch(`${bridgeUrl}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (resp.ok) {
        const data = (await resp.json()) as { output?: string; error?: string };
        if (data.output) {
          return data.output;
        }
      }
    } catch {
      // Bridge unavailable, rethrow original error so heuristic fallback engages
    }

    throw localErr;
  }
}

// In-memory caches to avoid re-triggering LLM calls on every navigation
const companyCache = new Map<string, { data: CompanyAiEvaluation; timestamp: number }>();
const marketCache = { data: null as MarketAiAnalysis | null, timestamp: 0 };
const chartCache = new Map<string, { data: ChartAiAnalysis; timestamp: number }>();

const COMPANY_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const MARKET_CACHE_TTL = 5 * 60 * 1000;   // 5 minutes
const CHART_CACHE_TTL = 10 * 60 * 1000;   // 10 minutes

export type CandleRecord = { time: number; open: number; high: number; low: number; close: number; volume: number };

export async function evaluateCompanyWithAgy(
  companyData: Record<string, unknown>,
  forceRefresh = false
): Promise<CompanyAiEvaluation> {
  const p = (companyData?.profile || {}) as Record<string, unknown>;
  const symbol = String(p.symbol || "UNKNOWN").toUpperCase();

  if (!forceRefresh) {
    const cached = companyCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < COMPANY_CACHE_TTL) {
      return cached.data;
    }
  }

  const price = (companyData?.price || companyData?.quote || {}) as Record<string, unknown>;
  const v = (companyData?.valuation || {}) as Record<string, unknown>;
  const dcf = (v.dcf || {}) as Record<string, unknown>;
  const lockin = (companyData?.lockin || {}) as Record<string, unknown>;
  const dividendsList = Array.isArray(companyData?.dividends) ? (companyData.dividends as Record<string, unknown>[]) : [];

  const ltp = Number(price.ltp ?? price.close ?? 0);
  const eps = Number(v.eps ?? 0);
  const pe = Number(v.pe ?? 0);
  const pb = Number(v.pb ?? 0);
  const bvps = Number(v.bvps ?? 0);
  const dcfVal = Number(dcf.per_share ?? 0);
  const graham = Number(v.graham_number ?? 0);
  const lockinDays = lockin.days_left !== undefined && lockin.days_left !== null ? Number(lockin.days_left) : null;
  const recentDividends = dividendsList
    .slice(0, 3)
    .map((d) => `${d.fy_bs || ""}: ${d.bonus_pct || 0}% Bonus, ${d.cash_pct || 0}% Cash`)
    .join("; ");

  const prompt = `You are a premier NEPSE (Nepal Stock Exchange) equity analyst.
Evaluate this company's investment fundamentals and provide clear timing advice:
- Symbol: ${symbol} (${p.name || symbol})
- Sector: ${p.sector_code || "Unknown"}
- Current LTP: NPR ${ltp} (52W High: NPR ${price.high_52w ?? "N/A"}, 52W Low: NPR ${price.low_52w ?? "N/A"})
- EPS: NPR ${eps}
- P/E Ratio: ${pe ? pe.toFixed(2) : "N/A"}
- P/B Ratio: ${pb ? pb.toFixed(2) : "N/A"}
- BVPS: NPR ${bvps}
- DCF Fair Value per Share: NPR ${dcfVal ? dcfVal.toFixed(2) : "N/A"}
- Graham Intrinsic Number: NPR ${graham ? graham.toFixed(2) : "N/A"}
- Promoter Lock-in: ${lockinDays !== null ? `${lockinDays} days left` : "No active lock-in"}
- Recent Dividends: ${recentDividends || "No recent dividends recorded"}

CRITICAL REQUIREMENTS:
1. Is this the best time to invest in this company, or should the investor wait for it? Give a definitive verdict.
2. What is the best price range to invest in this company for the short term (1-3 months)?
3. What is the best price range to invest in this company for the long term (1-3 years)?
4. Highlight fundamental score (0-100), key strengths, risks/red-flags, and catalysts.

Respond with ONLY a raw JSON object (strictly valid JSON, no markdown backticks, no explanations outside JSON):
{
  "symbol": "${symbol}",
  "verdict": "BUY NOW" | "WAIT FOR PULLBACK" | "ACCUMULATE ON DIPS" | "HOLD / NEUTRAL" | "AVOID",
  "is_best_time": true | false,
  "timing_assessment": "Clear 1-2 sentence statement on whether now is the prime time or why to wait",
  "wait_reason": "Specific reason to wait (e.g. overbought, impending lock-in supply, high valuation) or null if best time",
  "short_term_range": {
    "min": number,
    "max": number,
    "target": number,
    "outlook": "string technical/fundamental short term outlook"
  },
  "long_term_range": {
    "min": number,
    "max": number,
    "target": number,
    "outlook": "string 1-3 year horizon growth and compounding thesis"
  },
  "fundamental_score": number (0-100),
  "valuation_status": "UNDERVALUED" | "FAIR" | "OVERVALUED",
  "strengths": ["string", "string", "string"],
  "risks": ["string", "string", "string"],
  "catalysts": ["string", "string", "string"],
  "summary": "concise executive summary"
}`;

  try {
    const rawOut = await runAgyPrompt(prompt);
    const cleaned = cleanJson(rawOut);
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const shortRange = (parsed.short_term_range || {}) as Record<string, unknown>;
    const longRange = (parsed.long_term_range || {}) as Record<string, unknown>;

    const result: CompanyAiEvaluation = {
      symbol,
      verdict: (parsed.verdict as CompanyAiEvaluation["verdict"]) ?? (parsed.is_best_time ? "BUY NOW" : "WAIT FOR PULLBACK"),
      is_best_time: Boolean(parsed.is_best_time),
      timing_assessment: String(parsed.timing_assessment || "Fundamental analysis completed."),
      wait_reason: parsed.wait_reason ? String(parsed.wait_reason) : null,
      short_term_range: {
        min: Number(shortRange.min ?? ltp * 0.95),
        max: Number(shortRange.max ?? ltp * 1.02),
        target: Number(shortRange.target ?? ltp * 1.15),
        outlook: String(shortRange.outlook || "Support holding near current level.")
      },
      long_term_range: {
        min: Number(longRange.min ?? ltp * 0.9),
        max: Number(longRange.max ?? ltp * 1.05),
        target: Number(longRange.target ?? (dcfVal > ltp ? dcfVal : ltp * 1.35)),
        outlook: String(longRange.outlook || "Long term capital compounding potential.")
      },
      fundamental_score: Number(parsed.fundamental_score ?? 70),
      valuation_status: (parsed.valuation_status as CompanyAiEvaluation["valuation_status"]) ?? "FAIR",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks.map(String) : [],
      catalysts: Array.isArray(parsed.catalysts) ? parsed.catalysts.map(String) : [],
      summary: String(parsed.summary || ""),
      evaluated_at: new Date().toISOString(),
      source: "agy"
    };

    companyCache.set(symbol, { data: result, timestamp: Date.now() });
    return result;
  } catch (err: unknown) {
    console.warn(`AGY prompt failed for ${symbol}, falling back to analytical heuristic:`, err);
    const fallback = generateCompanyHeuristic(companyData);
    companyCache.set(symbol, { data: fallback, timestamp: Date.now() });
    return fallback;
  }
}

export async function evaluateMarketWithAgy(
  marketSummary: Record<string, unknown>,
  forceRefresh = false
): Promise<MarketAiAnalysis> {
  if (!forceRefresh && marketCache.data && Date.now() - marketCache.timestamp < MARKET_CACHE_TTL) {
    return marketCache.data;
  }

  const idx = (marketSummary?.index || {}) as Record<string, unknown>;
  const status = String(marketSummary?.status || "OPEN");
  const turnoverCrore = (Number(marketSummary?.turnover || 0) / 10000000).toFixed(2);
  const advances = Number(marketSummary?.advances || 0);
  const declines = Number(marketSummary?.declines || 0);
  const unchanged = Number(marketSummary?.unchanged || 0);
  const subIndicesList = Array.isArray(marketSummary?.sub_indices)
    ? (marketSummary.sub_indices as Record<string, unknown>[])
    : [];
  const subIndices = subIndicesList
    .slice(0, 6)
    .map((s) => `${s.code}: ${Number(s.change || 0) >= 0 ? "+" : ""}${s.change} (${s.pct_change}%)`)
    .join(", ");

  const prompt = `You are a chief NEPSE market strategist and quantitative equity analyst.
Analyze current Nepal Stock Exchange (NEPSE) market conditions based on these live metrics:
- Benchmark Index: NEPSE at ${idx.value ?? "N/A"} (${Number(idx.change || 0) >= 0 ? "+" : ""}${idx.change ?? 0} pts, ${idx.pct_change ?? 0}%)
- Trading Status: ${status}
- Turnover: NPR ${turnoverCrore} Crore (Total: NPR ${marketSummary?.turnover || 0})
- Breadth: ${advances} Advances vs ${declines} Declines (${unchanged} Unchanged)
- Key Sub-indices: ${subIndices || "N/A"}

ANALYZE:
1. Current Market Status / Trend (BULLISH, MODERATELY BULLISH, SIDEWAYS / NEUTRAL, BEARISH REVERSAL, BEARISH).
2. Market Confidence Score (0-100%) and Level (HIGH, MODERATE, LOW).
3. Investor Sentiment & Market Breadth assessment.
4. Key market drivers and risks.
5. Actionable guidance for retail and institutional investors.

Respond with ONLY a raw JSON object (strictly valid JSON, no markdown backticks, no explanations outside JSON):
{
  "market_status": "BULLISH" | "MODERATELY BULLISH" | "SIDEWAYS / NEUTRAL" | "BEARISH REVERSAL" | "BEARISH",
  "confidence_score": number (0-100),
  "confidence_level": "HIGH" | "MODERATE" | "LOW",
  "sentiment": "string sentiment (e.g. Risk-On / Optimistic, Cautious Accumulation)",
  "breadth_evaluation": "string evaluation of advance to decline breadth ratio and volume participation",
  "turnover_evaluation": "string evaluation of turnover liquidity",
  "key_drivers": ["string", "string", "string"],
  "risks": ["string", "string"],
  "actionable_advice": "clear tactical recommendation for market participants",
  "summary": "concise executive summary of current NEPSE pulse"
}`;

  try {
    const rawOut = await runAgyPrompt(prompt);
    const cleaned = cleanJson(rawOut);
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const result: MarketAiAnalysis = {
      market_status: (parsed.market_status as MarketAiAnalysis["market_status"]) ?? (Number(idx.change || 0) >= 0 ? "BULLISH" : "BEARISH"),
      confidence_score: Number(parsed.confidence_score ?? 70),
      confidence_level: (parsed.confidence_level as MarketAiAnalysis["confidence_level"]) ?? "MODERATE",
      sentiment: String(parsed.sentiment || "Cautious Accumulation"),
      breadth_evaluation: String(parsed.breadth_evaluation || `${advances} advances against ${declines} declines.`),
      turnover_evaluation: String(parsed.turnover_evaluation || `Turnover of NPR ${turnoverCrore} Crore.`),
      key_drivers: Array.isArray(parsed.key_drivers) ? parsed.key_drivers.map(String) : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks.map(String) : [],
      actionable_advice: String(parsed.actionable_advice || "Focus on fundamentally strong blue chips."),
      summary: String(parsed.summary || "NEPSE market session overview."),
      evaluated_at: new Date().toISOString(),
      source: "agy"
    };

    marketCache.data = result;
    marketCache.timestamp = Date.now();
    return result;
  } catch (err: unknown) {
    console.warn("AGY market prompt failed, falling back to analytical heuristic:", err);
    const fallback = generateMarketHeuristic(marketSummary);
    marketCache.data = fallback;
    marketCache.timestamp = Date.now();
    return fallback;
  }
}

export async function evaluateChartWithAgy(
  symbol: string,
  candles: CandleRecord[],
  timeframe = "1D",
  forceRefresh = false
): Promise<ChartAiAnalysis> {
  const upper = symbol.toUpperCase();
  const cacheKey = `${upper}:${timeframe}`;

  if (!forceRefresh) {
    const cached = chartCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CHART_CACHE_TTL) {
      return cached.data;
    }
  }

  if (!candles || candles.length < 5) {
    return generateChartHeuristic(upper, candles, timeframe);
  }

  const { swingHighs, swingLows } = extractSwingPoints(candles);
  const snap = computeTechnicalSnapshots(candles);

  const recentLowsStr = swingLows
    .slice(-3)
    .map((l) => `NPR ${l.price.toFixed(1)} (${l.dateStr}, ts: ${l.timestamp})`)
    .join(", ");
  const recentHighsStr = swingHighs
    .slice(-3)
    .map((h) => `NPR ${h.price.toFixed(1)} (${h.dateStr}, ts: ${h.timestamp})`)
    .join(", ");

  const prompt = `You are an elite Chartered Market Technician (CMT) and quantitative price-action analyst specializing in NEPSE (Nepal Stock Exchange).
Perform a comprehensive technical analysis for ${upper} on the ${timeframe} timeframe based on these exact chart candle metrics:
- Current Close: NPR ${snap.lastClose.toFixed(2)}
- 20 EMA: NPR ${snap.ema20.toFixed(2)}
- 50 SMA: NPR ${snap.sma50.toFixed(2)}
- RSI (14): ${snap.rsi14.toFixed(1)}
- Latest Volume: ${snap.lastVol.toLocaleString()} shares vs 20-period Average Volume: ${Math.round(snap.avgVol).toLocaleString()} shares
- Recent Swing Highs: ${recentHighsStr || "N/A"}
- Recent Swing Lows: ${recentLowsStr || "N/A"}

CRITICAL REQUIREMENTS:
1. Determine Technical Stance, Actionable Trade Setup (Entry zone min-max, Targets T1 and T2, Hard Stop Loss, Risk-to-Reward ratio).
2. Recommend Best Indicators to plot (e.g. EMA, Supertrend, RSI, Bollinger Bands, ATR) with clear rationale.
3. Recommend Exact Drawing Tools to apply directly on the chart canvas:
   - Primary Trendline (segment) using actual swing timestamps and values.
   - Horizontal Resistance and Support levels (horizontalStraightLine).
   - Demand/Accumulation Zone box (rect).
4. Author a detailed 3-part technical research article below the chart:
   - Part 1: Why these specific indicators and drawing tools were chosen.
   - Part 2: What does this chart say (detailed price action, volume profile, candle patterns, trend phase).
   - Part 3: What to do with this (step-by-step actionable trade plan, invalidation rules, risk controls).

Respond with ONLY a raw JSON object (strictly valid JSON, no markdown backticks, no explanations outside JSON):
{
  "symbol": "${upper}",
  "timeframe": "${timeframe}",
  "title": "Concise high-impact technical analysis headline",
  "stance": "STRONG BULLISH" | "BULLISH BREAKOUT" | "BULLISH" | "NEUTRAL / ACCUMULATION" | "BEARISH" | "REVERSAL WATCH",
  "confidence_score": number (0-100),
  "action": "BUY ON PULLBACK" | "BUY BREAKOUT" | "HOLD / ACCUMULATE" | "TAKE PROFIT" | "WAIT / AVOID",
  "entry_zone": { "min": number, "max": number },
  "targets": [
    { "label": "Target 1 (Intermediate)", "price": number, "upside_pct": number },
    { "label": "Target 2 (Extended)", "price": number, "upside_pct": number }
  ],
  "stop_loss": { "price": number, "risk_pct": number },
  "risk_reward_ratio": "1:2.8",
  "recommended_indicators": [
    { "type": "ema", "period": 20, "color": "#3b82f6", "reason": "Dynamic momentum and trailing support" },
    { "type": "supertrend", "period": 10, "color": "#10b981", "reason": "Regime filter and trailing stop" },
    { "type": "rsi", "period": 14, "color": "#8b5cf6", "reason": "Momentum oscillator tracking overbought/oversold momentum" }
  ],
  "recommended_drawings": [
    {
      "name": "segment",
      "label": "Ascending Support Trendline",
      "points": [{ "timestamp": number, "value": number }, { "timestamp": number, "value": number }],
      "color": "#16a34a",
      "reason": "Anchors higher structural swing lows defining primary trend vector"
    },
    {
      "name": "horizontalStraightLine",
      "label": "Overhead Major Resistance",
      "points": [{ "timestamp": number, "value": number }],
      "color": "#dc2626",
      "reason": "Previous swing peak where selling supply concentrated"
    },
    {
      "name": "horizontalStraightLine",
      "label": "Key Structural Support Level",
      "points": [{ "timestamp": number, "value": number }],
      "color": "#2563eb",
      "reason": "Structural pivot floor defending upward continuation"
    },
    {
      "name": "rect",
      "label": "Demand & Consolidation Zone",
      "points": [{ "timestamp": number, "value": number }, { "timestamp": number, "value": number }],
      "color": "#10b981",
      "reason": "Price pocket where institutional accumulation absorbs floating supply"
    }
  ],
  "article": {
    "why_tools_used": "Multi-paragraph explanation of why each indicator and drawing tool was chosen...",
    "what_chart_says": "Multi-paragraph breakdown of price action, volume expansion, and market structure...",
    "what_to_do": "Multi-paragraph actionable trade execution plan and risk management...",
    "risk_factors": ["string", "string"]
  }
}`;

  try {
    const rawOut = await runAgyPrompt(prompt, 60000);
    const cleaned = cleanJson(rawOut);
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const entryZone = (parsed.entry_zone || {}) as Record<string, unknown>;
    const stopLoss = (parsed.stop_loss || {}) as Record<string, unknown>;
    const article = (parsed.article || {}) as Record<string, unknown>;

    const result: ChartAiAnalysis = {
      symbol: upper,
      timeframe,
      title: String(parsed.title || `${upper} Technical Analysis`),
      stance: (parsed.stance as ChartAiAnalysis["stance"]) ?? "BULLISH",
      confidence_score: Number(parsed.confidence_score ?? 75),
      action: (parsed.action as ChartAiAnalysis["action"]) ?? "BUY ON PULLBACK",
      entry_zone: {
        min: Number(entryZone.min ?? snap.lastClose * 0.98),
        max: Number(entryZone.max ?? snap.lastClose * 1.01),
      },
      targets: Array.isArray(parsed.targets)
        ? (parsed.targets as Array<Record<string, unknown>>).map((t) => ({
            label: String(t.label || "Target"),
            price: Number(t.price ?? snap.lastClose * 1.1),
            upside_pct: t.upside_pct !== undefined ? Number(t.upside_pct) : undefined,
          }))
        : [
            { label: "Target 1", price: Math.round(snap.lastClose * 1.08), upside_pct: 8.0 },
            { label: "Target 2", price: Math.round(snap.lastClose * 1.16), upside_pct: 16.0 },
          ],
      stop_loss: {
        price: Number(stopLoss.price ?? snap.lastClose * 0.95),
        risk_pct: stopLoss.risk_pct !== undefined ? Number(stopLoss.risk_pct) : undefined,
      },
      risk_reward_ratio: String(parsed.risk_reward_ratio || "1:2.5"),
      recommended_indicators: Array.isArray(parsed.recommended_indicators)
        ? (parsed.recommended_indicators as ChartAiIndicator[])
        : [],
      recommended_drawings: Array.isArray(parsed.recommended_drawings)
        ? (parsed.recommended_drawings as ChartAiDrawing[])
        : [],
      article: {
        why_tools_used: String(article.why_tools_used || "Technical indicators provide multi-timeframe confirmation."),
        what_chart_says: String(article.what_chart_says || "Price action demonstrates defined structural support."),
        what_to_do: String(article.what_to_do || "Accumulate within the defined entry zone with risk controls."),
        risk_factors: Array.isArray(article.risk_factors) ? article.risk_factors.map(String) : [],
      },
      evaluated_at: new Date().toISOString(),
      source: "agy",
    };

    chartCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (err: unknown) {
    console.warn(`AGY chart analysis failed for ${upper}, falling back to analytical heuristic:`, err);
    const fallback = generateChartHeuristic(upper, candles, timeframe);
    chartCache.set(cacheKey, { data: fallback, timestamp: Date.now() });
    return fallback;
  }
}

// Fallback technical heuristic calculator
function generateChartHeuristic(symbol: string, candles: CandleRecord[], timeframe = "1D"): ChartAiAnalysis {
  const upper = symbol.toUpperCase();
  const snap = computeTechnicalSnapshots(candles);
  const { swingHighs, swingLows } = extractSwingPoints(candles);

  const lastClose = snap.lastClose || 100;
  const isUptrend = lastClose >= snap.sma20 && snap.sma20 >= snap.sma50;
  const isDowntrend = lastClose < snap.sma20 && snap.sma20 < snap.sma50;

  const stance: ChartAiAnalysis["stance"] = isUptrend
    ? "BULLISH"
    : isDowntrend
    ? "BEARISH"
    : "NEUTRAL / ACCUMULATION";

  const action: ChartAiAnalysis["action"] = isUptrend
    ? "BUY ON PULLBACK"
    : isDowntrend
    ? "WAIT / AVOID"
    : "HOLD / ACCUMULATE";

  const lastHigh = swingHighs[swingHighs.length - 1]?.price ?? lastClose * 1.08;
  const secondHigh = swingHighs[swingHighs.length - 2]?.price ?? lastClose * 1.15;
  const lastLow = swingLows[swingLows.length - 1]?.price ?? lastClose * 0.94;

  const stopPrice = Math.round(lastLow * 0.98);
  const target1 = Math.round(Math.max(lastHigh, lastClose * 1.06));
  const target2 = Math.round(Math.max(secondHigh, lastClose * 1.14));

  const recommendedDrawings: ChartAiDrawing[] = [];

  // Trendline if 2 swing lows exist
  if (swingLows.length >= 2) {
    const p1 = swingLows[swingLows.length - 2];
    const p2 = swingLows[swingLows.length - 1];
    recommendedDrawings.push({
      name: "segment",
      label: "Ascending Support Trendline",
      points: [
        { timestamp: p1.timestamp, value: p1.price },
        { timestamp: p2.timestamp, value: p2.price },
      ],
      color: "#16a34a",
      reason: `Connects key swing lows at NPR ${p1.price.toFixed(1)} and NPR ${p2.price.toFixed(1)} defining trend trajectory.`,
    });
  }

  // Horizontal Resistance
  if (swingHighs.length >= 1) {
    const sh = swingHighs[swingHighs.length - 1];
    recommendedDrawings.push({
      name: "horizontalStraightLine",
      label: `Overhead Swing Resistance (NPR ${sh.price.toFixed(1)})`,
      points: [{ timestamp: sh.timestamp, value: sh.price }],
      color: "#dc2626",
      reason: `Historical supply zone where previous price rejection occurred at NPR ${sh.price.toFixed(1)}.`,
    });
  }

  // Horizontal Support
  if (swingLows.length >= 1) {
    const sl = swingLows[swingLows.length - 1];
    recommendedDrawings.push({
      name: "horizontalStraightLine",
      label: `Key Pivot Support (NPR ${sl.price.toFixed(1)})`,
      points: [{ timestamp: sl.timestamp, value: sl.price }],
      color: "#2563eb",
      reason: `Structural price floor where buyers previously stepped in at NPR ${sl.price.toFixed(1)}.`,
    });
  }

  // Demand Box
  if (candles.length >= 15) {
    const startC = candles[Math.max(0, candles.length - 25)];
    const endC = candles[candles.length - 1];
    recommendedDrawings.push({
      name: "rect",
      label: "High-Volume Demand Zone",
      points: [
        { timestamp: startC.time * 1000, value: Math.round(lastClose * 1.01) },
        { timestamp: endC.time * 1000, value: Math.round(lastClose * 0.96) },
      ],
      color: "#10b981",
      reason: "Institutional accumulation pocket providing liquidity absorption.",
    });
  }

  return {
    symbol: upper,
    timeframe,
    title: `${upper} Technical Analysis: ${isUptrend ? "Constructive Uptrend with Bullish Bias" : "Consolidation Range"}`,
    stance,
    confidence_score: isUptrend ? 80 : 65,
    action,
    entry_zone: {
      min: Math.round(lastClose * 0.98),
      max: Math.round(lastClose * 1.01),
    },
    targets: [
      { label: "Target 1 (Primary Resistance)", price: target1, upside_pct: Math.round(((target1 - lastClose) / lastClose) * 1000) / 10 },
      { label: "Target 2 (Extended Extension)", price: target2, upside_pct: Math.round(((target2 - lastClose) / lastClose) * 1000) / 10 },
    ],
    stop_loss: {
      price: stopPrice,
      risk_pct: Math.round(((lastClose - stopPrice) / lastClose) * 1000) / 10,
    },
    risk_reward_ratio: "1:2.4",
    recommended_indicators: [
      { type: "ema", period: 20, color: "#3b82f6", reason: "Dynamic 20-period short-term momentum guide" },
      { type: "sma", period: 50, color: "#f59e0b", reason: "Intermediate cyclical support baseline" },
      { type: "supertrend", period: 10, color: "#10b981", reason: "Trailing stop regime and volatility envelope" },
      { type: "rsi", period: 14, color: "#8b5cf6", reason: "Momentum gauge to detect overbought/oversold conditions" },
    ],
    recommended_drawings: recommendedDrawings,
    article: {
      why_tools_used: `To objectively evaluate ${upper} on the ${timeframe} chart, we deploy a confluent toolkit balancing moving average trend alignment, momentum oscillators, and structural geometric levels. The 20 EMA (NPR ${snap.ema20.toFixed(1)}) and 50 SMA (NPR ${snap.sma50.toFixed(1)}) are chosen to filter out random intraday noise and isolate true institutional directional commitment. Complementing trend metrics, RSI 14 (currently ${snap.rsi14.toFixed(1)}) provides momentum velocity diagnostics without premature exit signals. On the chart canvas, the ascending trendline anchors consecutive higher swing lows, while the horizontal resistance line highlights where prior supply overhead met price rejection.`,
      what_chart_says: `${upper} is trading at NPR ${lastClose.toFixed(2)}. Price action exhibits ${isUptrend ? "an orderly sequence of higher swing highs and higher swing lows, maintaining position comfortably above both the 20 EMA and 50 SMA." : "a consolidation phase with price compressing between immediate support and overhead resistance."} Volume profile indicates ${snap.lastVol > snap.avgVol ? "expanding liquidity participation confirming price commitment." : "steady consolidation volume."} The momentum indicator (RSI at ${snap.rsi14.toFixed(1)}) confirms healthy buying power with sufficient headroom before reaching overbought extremes.`,
      what_to_do: `Tactical Playbook for ${upper}:
1. Accumulation Strategy: Stagger entries across the defined buy zone (NPR ${Math.round(lastClose * 0.98)} - ${Math.round(lastClose * 1.01)}). Avoid chasing impulsive green candles and instead capitalize on intraday pullbacks toward the 20 EMA.
2. Profit Targets: Secure partial gains (30-50%) at Target 1 (NPR ${target1}), and trail remaining exposure using the 20 EMA toward Target 2 (NPR ${target2}).
3. Risk Invalidation: Maintain a strict stop-loss below NPR ${stopPrice}. A decisive closing breakdown below this level invalidates the bullish thesis and warrants capital preservation.`,
      risk_factors: [
        `Breakdown below structural support at NPR ${stopPrice} invalidates the setup.`,
        "Overhead profit-taking near prior swing highs may induce consolidation periods.",
      ],
    },
    evaluated_at: new Date().toISOString(),
    source: "heuristic",
  };
}

function extractSwingPoints(candles: CandleRecord[]) {
  const swingHighs: Array<{ timestamp: number; price: number; dateStr: string }> = [];
  const swingLows: Array<{ timestamp: number; price: number; dateStr: string }> = [];

  const len = candles.length;
  if (len < 5) return { swingHighs, swingLows };

  for (let i = 2; i < len - 2; i++) {
    const c = candles[i];
    const isPeak =
      c.high >= candles[i - 1].high &&
      c.high > candles[i - 2].high &&
      c.high >= candles[i + 1].high &&
      c.high > candles[i + 2].high;
    const isTrough =
      c.low <= candles[i - 1].low &&
      c.low < candles[i - 2].low &&
      c.low <= candles[i + 1].low &&
      c.low < candles[i + 2].low;

    if (isPeak) {
      swingHighs.push({
        timestamp: c.time * 1000,
        price: c.high,
        dateStr: new Date(c.time * 1000).toISOString().split("T")[0],
      });
    }
    if (isTrough) {
      swingLows.push({
        timestamp: c.time * 1000,
        price: c.low,
        dateStr: new Date(c.time * 1000).toISOString().split("T")[0],
      });
    }
  }

  return { swingHighs, swingLows };
}

function computeTechnicalSnapshots(candles: CandleRecord[]) {
  const closes = candles.map((c) => c.close);
  const len = closes.length;
  const lastClose = closes[len - 1] ?? 0;

  const sma20 = len >= 20 ? closes.slice(len - 20).reduce((a, b) => a + b, 0) / 20 : lastClose;
  const sma50 = len >= 50 ? closes.slice(len - 50).reduce((a, b) => a + b, 0) / 50 : lastClose;

  let ema20 = closes[0] ?? 0;
  const k20 = 2 / (20 + 1);
  for (let i = 1; i < len; i++) {
    ema20 = closes[i] * k20 + ema20 * (1 - k20);
  }

  let gain = 0;
  let loss = 0;
  for (let i = Math.max(1, len - 14); i < len; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gain += d;
    else loss -= d;
  }
  const avgGain = gain / 14;
  const avgLoss = loss / 14;
  const rsi14 = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  const vols = candles.map((c) => c.volume);
  const lastVol = vols[len - 1] ?? 0;
  const avgVol = len >= 20 ? vols.slice(len - 20).reduce((a, b) => a + b, 0) / 20 : lastVol;

  return { lastClose, sma20, sma50, ema20, rsi14, lastVol, avgVol };
}

// Fallback heuristic generators if agy is offline or busy
function generateCompanyHeuristic(data: Record<string, unknown>): CompanyAiEvaluation {
  const p = (data?.profile || {}) as Record<string, unknown>;
  const symbol = String(p.symbol || "UNKNOWN");
  const price = (data?.price || data?.quote || {}) as Record<string, unknown>;
  const v = (data?.valuation || {}) as Record<string, unknown>;
  const dcf = (v.dcf || {}) as Record<string, unknown>;
  const lockin = (data?.lockin || {}) as Record<string, unknown>;

  const ltp = Number(price.ltp ?? 0);
  const eps = Number(v.eps ?? 0);
  const pe = Number(v.pe ?? 0);
  const pb = Number(v.pb ?? 0);
  const dcfVal = Number(dcf.per_share ?? 0);
  const graham = Number(v.graham_number ?? 0);
  const lockinDays = lockin.days_left !== undefined && lockin.days_left !== null ? Number(lockin.days_left) : null;

  const isLockinRisk = lockinDays !== null && lockinDays > 0 && lockinDays <= 45;
  const isUndervalued = (dcfVal > 0 && ltp < dcfVal) || (graham > 0 && ltp < graham) || (pe > 0 && pe < 18);
  const isOvervalued = pe > 38 || (pb > 5 && eps < 15);

  let verdict: CompanyAiEvaluation["verdict"] = "ACCUMULATE ON DIPS";
  let isBestTime = true;
  let waitReason: string | null = null;
  let timingAssessment = "Current valuation presents reasonable risk-reward for staggered entry.";

  if (isLockinRisk) {
    verdict = "WAIT FOR PULLBACK";
    isBestTime = false;
    waitReason = `Promoter lock-in expiry in ${lockinDays} days may introduce short-term floating supply pressure.`;
    timingAssessment = `Wait until lock-in period ends in ${lockinDays} days to avoid impending supply absorption.`;
  } else if (isOvervalued) {
    verdict = "WAIT FOR PULLBACK";
    isBestTime = false;
    waitReason = `Trading at elevated multiples (PE: ${pe.toFixed(1)}x, PB: ${pb.toFixed(1)}x); wait for multiple compression or price consolidation.`;
    timingAssessment = "Valuation is currently extended; patience recommended for a healthier pullback.";
  } else if (isUndervalued) {
    verdict = "BUY NOW";
    isBestTime = true;
    waitReason = null;
    timingAssessment = `Prime accumulation zone; trading below estimated intrinsic value (DCF: NPR ${dcfVal ? dcfVal.toFixed(0) : "N/A"}).`;
  }

  const baseLtp = ltp > 0 ? ltp : 100;
  const score = Math.max(30, Math.min(95, Math.round(50 + (isUndervalued ? 25 : 0) - (isOvervalued ? 20 : 0) - (isLockinRisk ? 15 : 0) + (eps > 20 ? 10 : 0))));

  return {
    symbol,
    verdict,
    is_best_time: isBestTime,
    timing_assessment: timingAssessment,
    wait_reason: waitReason,
    short_term_range: {
      min: Math.round(baseLtp * 0.94),
      max: Math.round(baseLtp * 1.02),
      target: Math.round(baseLtp * 1.12),
      outlook: isBestTime ? "Positive risk-reward with upside toward resistance." : "Consolidation expected before clear momentum."
    },
    long_term_range: {
      min: Math.round(baseLtp * 0.90),
      max: Math.round(baseLtp * 1.05),
      target: Math.round(Math.max(dcfVal, graham, baseLtp * 1.30)),
      outlook: "Long term compounding backed by business fundamentals and dividend yield."
    },
    fundamental_score: score,
    valuation_status: isUndervalued ? "UNDERVALUED" : isOvervalued ? "OVERVALUED" : "FAIR",
    strengths: [
      eps > 0 ? `Positive EPS of NPR ${eps.toFixed(2)}` : "Operational track record",
      v.bvps ? `Book value backing of NPR ${Number(v.bvps).toFixed(2)}` : "Asset base integrity",
      !isLockinRisk ? "No immediate lock-in expiry overhang" : "Established market presence"
    ],
    risks: [
      isLockinRisk ? `Lock-in expiry in ${lockinDays} days` : "Macro interest rate and liquidity fluctuations",
      isOvervalued ? "Multiple contraction risk" : "Sector-specific regulatory developments"
    ],
    catalysts: [
      "Quarterly earnings disclosure",
      "Monetary policy and liquidity conditions in banking sector",
      "Annual dividend announcement"
    ],
    summary: `${symbol} is evaluated with a fundamental score of ${score}/100. ${timingAssessment}`,
    evaluated_at: new Date().toISOString(),
    source: "heuristic"
  };
}

function generateMarketHeuristic(summary: Record<string, unknown>): MarketAiAnalysis {
  const idx = (summary?.index || {}) as Record<string, unknown>;
  const chg = Number(idx.change ?? 0);
  const pct = Number(idx.pct_change ?? 0);
  const adv = Number(summary?.advances ?? 0);
  const dec = Number(summary?.declines ?? 0);
  const turnover = Number(summary?.turnover ?? 0);
  const turnoverCrore = (turnover / 10000000).toFixed(2);

  const ratio = dec > 0 ? adv / dec : adv > 0 ? 3 : 1;
  const isBull = chg > 0 && ratio >= 1.2;
  const isBear = chg < 0 && ratio <= 0.8;

  const score = Math.max(25, Math.min(95, Math.round(50 + (chg > 0 ? 15 : -15) + (ratio > 1.5 ? 15 : ratio < 0.7 ? -15 : 0) + (turnover > 4000000000 ? 10 : 0))));

  return {
    market_status: isBull ? "BULLISH" : isBear ? "BEARISH" : "SIDEWAYS / NEUTRAL",
    confidence_score: score,
    confidence_level: score >= 70 ? "HIGH" : score >= 50 ? "MODERATE" : "LOW",
    sentiment: isBull ? "Risk-On / Constructive" : isBear ? "Risk-Off / Cautious" : "Neutral / Stock-Specific",
    breadth_evaluation: `Market breadth is ${adv > dec ? "positive" : "negative"} with ${adv} advances vs ${dec} declines (ratio: ${ratio.toFixed(2)}:1).`,
    turnover_evaluation: `Session turnover registered at NPR ${turnoverCrore} Crore indicating ${turnover > 4000000000 ? "active institutional liquidity" : "moderate liquidity"}.`,
    key_drivers: [
      `Index moved ${chg >= 0 ? "+" : ""}${chg.toFixed(2)} points (${pct.toFixed(2)}%)`,
      "Sectoral rotation across leading liquidity drivers",
      "Turnover stability confirming prevailing trend"
    ],
    risks: [
      "Near-term technical resistance zones",
      "Intraday profit booking in rapid movers"
    ],
    actionable_advice: isBull
      ? "Maintain exposure in fundamentally strong sector leaders. Accumulate quality scrips on intraday dips."
      : isBear
      ? "Exercise caution. Hold adequate cash reserves and wait for clear reversal confirmation before aggressive buying."
      : "Adopt a stock-specific selective approach; focus on value counters with upcoming dividend catalysts.",
    summary: `NEPSE index stands at ${idx.value ?? "N/A"} (${chg >= 0 ? "+" : ""}${chg} pts) with ${score}% market confidence score.`,
    evaluated_at: new Date().toISOString(),
    source: "heuristic"
  };
}
