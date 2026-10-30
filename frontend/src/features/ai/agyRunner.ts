import { execFile } from "child_process";
import type { ChartAiAnalysis, ChartAiArticle, ChartQuant, CompanyAiEvaluation, MarketAiAnalysis, NewsAiEvaluation } from "./types";
import { computeChartQuant, deriveCall, quantDrawings, quantIndicators, quantNarrative } from "./chartQuant";

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
    const bridgeSecret = process.env.AGY_BRIDGE_SECRET;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (bridgeSecret) {
        headers["X-Bridge-Secret"] = bridgeSecret;
      }
      const resp = await fetch(`${bridgeUrl}/prompt`, {
        method: "POST",
        headers,
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
const newsCache = new Map<number, { data: NewsAiEvaluation; timestamp: number }>();

const COMPANY_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const MARKET_CACHE_TTL = 5 * 60 * 1000;   // 5 minutes
const CHART_CACHE_TTL = 10 * 60 * 1000;   // 10 minutes
const NEWS_CACHE_TTL = 15 * 60 * 1000;    // 15 minutes

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

const STANCES: ChartAiAnalysis["stance"][] = ["STRONG BULLISH", "BULLISH BREAKOUT", "BULLISH", "NEUTRAL / ACCUMULATION", "BEARISH", "REVERSAL WATCH"];
const ACTIONS: ChartAiAnalysis["action"][] = ["BUY ON PULLBACK", "BUY BREAKOUT", "HOLD / ACCUMULATE", "TAKE PROFIT", "WAIT / AVOID"];
const STANCE_ACTION_CONFLICT = (s: string, a: string) => (s === "BEARISH" && a !== "WAIT / AVOID") || (s.includes("BULLISH") && a === "WAIT / AVOID");

// Deterministic quant engine builds every number and drawing; the LLM only supplies the professional narrative on top.
function buildChartAnalysis(upper: string, timeframe: string, bars: CandleRecord[], q: ChartQuant, source: "agy" | "heuristic"): ChartAiAnalysis {
  const call = deriveCall(q);
  const pct = (t: number) => Math.round(((t - q.last_close) / q.last_close) * 1000) / 10;
  return {
    symbol: upper,
    timeframe,
    title: `${upper} ${timeframe}: ${q.regime.label.toLowerCase().replace(/^./, (c) => c.toUpperCase())}, ${q.score >= 0 ? "+" : ""}${q.score} confluence`,
    ...call,
    entry_zone: { min: q.plan.entry_min, max: q.plan.entry_max },
    targets: q.plan.targets.map((price, i) => ({
      label: ["Target 1 (nearest supply)", "Target 2 (next supply / measured move)", "Target 3 (Fibonacci extension / runner)"][i],
      price,
      upside_pct: pct(price),
    })),
    stop_loss: { price: q.plan.stop, risk_pct: q.plan.risk_pct },
    risk_reward_ratio: `1:${q.plan.rr[1]}`,
    recommended_indicators: quantIndicators(q),
    recommended_drawings: quantDrawings(bars, q),
    article: quantNarrative(upper, timeframe, q),
    quant: q,
    evaluated_at: new Date().toISOString(),
    source,
  };
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

  const q = computeChartQuant(candles ?? []);
  if (!q) throw new Error("Not enough price history for technical analysis (need 30+ bars).");
  const base = buildChartAnalysis(upper, timeframe, candles, q, "heuristic");

  const pack = {
    symbol: upper,
    timeframe,
    last_close: q.last_close,
    confluence_score: q.score,
    regime: q.regime,
    structure: q.structure,
    momentum: q.momentum,
    volatility: q.volatility,
    volume: q.volume,
    support_resistance: q.levels,
    fibonacci: q.fib,
    candle_patterns: q.patterns,
    higher_timeframes: q.mtf,
    range_52w: q.range,
    signals: q.signals,
    trade_plan: q.plan,
    scenarios: q.scenarios,
    model_call: { stance: base.stance, action: base.action, confidence_score: base.confidence_score },
  };

  const prompt = `You are the head of technical research at an institutional desk covering NEPSE (Nepal Stock Exchange: ±10% daily circuit, T+2 settlement, retail-dominated flows, no practical shorting).
A quantitative engine has already computed everything below from ${q.bars} bars of ${upper} ${timeframe} data. Write the research note a senior CMT would publish.

QUANT PACK (authoritative; never invent or alter numbers, cite them):
${JSON.stringify(pack)}

WRITING RULES:
- Be specific: reference exact levels, touch counts, ADX, RSI, relative volume, value area, POC, Fibonacci levels, higher-timeframe trend.
- Explicitly discuss where signals CONFLICT (e.g. strong trend but overbought, bullish structure but weak volume) and what that means for odds.
- State what would change your mind (invalidation) and the trigger that upgrades conviction.
- Use the supplied trade_plan and scenarios as-is. Do not change prices. You may change stance/action/confidence only if you justify it in the note; keep them consistent with each other.
- No generic filler, no disclaimers, no repeating the same fact in several sections. 3-5 dense sentences per section.

Respond with ONLY a raw JSON object (valid JSON, no markdown fences):
{
  "title": "sharp, specific headline with a thesis (not generic)",
  "stance": "STRONG BULLISH" | "BULLISH BREAKOUT" | "BULLISH" | "NEUTRAL / ACCUMULATION" | "BEARISH" | "REVERSAL WATCH",
  "action": "BUY ON PULLBACK" | "BUY BREAKOUT" | "HOLD / ACCUMULATE" | "TAKE PROFIT" | "WAIT / AVOID",
  "confidence_score": number,
  "article": {
    "executive_summary": "the thesis, edge, and key conflict in one paragraph",
    "market_structure": "swing structure, BOS/CHoCH, trend phase, key S/R and why they matter",
    "momentum_volatility": "RSI/MACD/ADX/divergence, ATR regime, squeeze, expected move",
    "volume_analysis": "volume profile, value area/POC acceptance, OBV flow, candle evidence",
    "multi_timeframe": "weekly/monthly alignment and implication for position sizing",
    "why_tools_used": "why this indicator/level toolkit fits the current regime",
    "what_chart_says": "synthesis of the three most important facts",
    "what_to_do": "numbered execution plan: entry, scaling, targets, stop, trailing, sizing, with if/then rules",
    "risk_factors": ["specific risk 1", "specific risk 2", "specific risk 3"]
  }
}`;

  try {
    const rawOut = await runAgyPrompt(prompt, 120000);
    const parsed = JSON.parse(cleanJson(rawOut)) as Record<string, unknown>;
    const art = (parsed.article || {}) as Record<string, unknown>;
    const str = (k: Exclude<keyof ChartAiArticle, "risk_factors">): string =>
      typeof art[k] === "string" && (art[k] as string).trim().length > 20 ? (art[k] as string) : base.article[k] ?? "";

    const stance = STANCES.includes(parsed.stance as never) ? (parsed.stance as ChartAiAnalysis["stance"]) : base.stance;
    const action = ACTIONS.includes(parsed.action as never) ? (parsed.action as ChartAiAnalysis["action"]) : base.action;
    const consistent = !STANCE_ACTION_CONFLICT(stance, action);
    const conf = Number(parsed.confidence_score);

    const result: ChartAiAnalysis = {
      ...base,
      title: typeof parsed.title === "string" && parsed.title.length > 8 ? parsed.title : base.title,
      stance: consistent ? stance : base.stance,
      action: consistent ? action : base.action,
      confidence_score: Number.isFinite(conf) ? Math.round(Math.max(0, Math.min(100, conf))) : base.confidence_score,
      article: {
        executive_summary: str("executive_summary"),
        market_structure: str("market_structure"),
        momentum_volatility: str("momentum_volatility"),
        volume_analysis: str("volume_analysis"),
        multi_timeframe: str("multi_timeframe"),
        why_tools_used: str("why_tools_used"),
        what_chart_says: str("what_chart_says"),
        what_to_do: str("what_to_do"),
        risk_factors:
          Array.isArray(art.risk_factors) && art.risk_factors.length ? art.risk_factors.map(String) : base.article.risk_factors,
      },
      source: "agy",
    };

    chartCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (err: unknown) {
    console.warn(`AGY chart analysis failed for ${upper}, using quant engine narrative:`, err);
    chartCache.set(cacheKey, { data: base, timestamp: Date.now() });
    return base;
  }
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

export async function evaluateNewsWithAgy(
  newsItem: Record<string, unknown>,
  forceRefresh = false
): Promise<NewsAiEvaluation> {
  const newsId = Number(newsItem.id || 0);

  if (!forceRefresh && newsId > 0) {
    const cached = newsCache.get(newsId);
    if (cached && Date.now() - cached.timestamp < NEWS_CACHE_TTL) {
      return cached.data;
    }
  }

  const title = String(newsItem.title || "");
  const summary = String(newsItem.summary || "");
  const source = String(newsItem.source || "NEPSE Portal");
  const category = String(newsItem.category || "company");
  const symbols = Array.isArray(newsItem.symbols) ? (newsItem.symbols as string[]) : [];
  const sector = String(newsItem.sector || "General Market");
  const baselineRec = String(newsItem.action_recommendation || "HOLD & MONITOR");

  const prompt = `You are a chief NEPSE (Nepal Stock Exchange) equity and regulatory research strategist.
Analyze the investment impact of this breaking financial news or regulatory release:
- Title: ${title}
- Source: ${source}
- Category: ${category}
- Published Date: ${newsItem.published_on || "Recent"}
- Mentioned Symbols: ${symbols.join(", ") || "None directly mentioned"}
- Sector: ${sector}
- Summary: ${summary}
- Baseline Action Recommendation: ${baselineRec}

CRITICAL REQUIREMENTS:
1. Impact Stance: BULLISH, BEARISH, NEUTRAL, or WATCH.
2. Impact Score: integer between -100 (heavily bearish) and +100 (heavily bullish).
3. Action Recommendation: e.g. "ACCUMULATE ON DIPS", "BUY BEFORE BOOK CLOSURE", "AGGRESSIVE RISK-ON", "EXERCISE CAUTION", "HOLD & MONITOR", "APPLY RIGHTS".
4. Actionable Playbook: 2-3 concise sentences detailing EXACTLY what the retail / institutional investor should do (entry tactics, price sensitivity, time to act, positioning).
5. Target Horizon: "IMMEDIATE (1-5 DAYS)", "SHORT TERM (1-3 MO)", or "MEDIUM TERM (6-12 MO)".
6. Affected Symbols and Affected Sectors.
7. Catalysts & Risks to Watch.
8. Investor Checklist: 3 bullet points with specific action checks for the user.

Respond with ONLY a raw JSON object (strictly valid JSON, no markdown backticks, no explanations outside JSON):
{
  "news_id": ${newsId},
  "title": "${title.replace(/"/g, '\\"')}",
  "impact_stance": "BULLISH" | "BEARISH" | "NEUTRAL" | "WATCH",
  "impact_score": number,
  "action_recommendation": "string",
  "actionable_playbook": "string",
  "target_horizon": "string",
  "affected_symbols": ["string"],
  "affected_sectors": ["string"],
  "catalysts": ["string", "string"],
  "risks_to_watch": ["string", "string"],
  "investor_checklist": ["string", "string", "string"]
}`;

  try {
    const rawOut = await runAgyPrompt(prompt);
    const cleaned = cleanJson(rawOut);
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const result: NewsAiEvaluation = {
      news_id: newsId,
      title,
      impact_stance: (parsed.impact_stance as NewsAiEvaluation["impact_stance"]) || "NEUTRAL",
      impact_score: Number(parsed.impact_score ?? 0),
      action_recommendation: String(parsed.action_recommendation || baselineRec),
      actionable_playbook: String(parsed.actionable_playbook || summary),
      target_horizon: String(parsed.target_horizon || "SHORT TERM (1-3 MO)"),
      affected_symbols: Array.isArray(parsed.affected_symbols) ? parsed.affected_symbols.map(String) : symbols,
      affected_sectors: Array.isArray(parsed.affected_sectors) ? parsed.affected_sectors.map(String) : [sector],
      catalysts: Array.isArray(parsed.catalysts) ? parsed.catalysts.map(String) : [],
      risks_to_watch: Array.isArray(parsed.risks_to_watch) ? parsed.risks_to_watch.map(String) : [],
      investor_checklist: Array.isArray(parsed.investor_checklist) ? parsed.investor_checklist.map(String) : [],
      analyzed_at: new Date().toISOString(),
      source: "agy",
    };

    if (newsId > 0) {
      newsCache.set(newsId, { data: result, timestamp: Date.now() });
    }
    return result;
  } catch (err: unknown) {
    console.warn(`AGY prompt failed for news ${newsId}, engaging analytical heuristic:`, err);
    const fallback = generateNewsHeuristic(newsItem);
    if (newsId > 0) {
      newsCache.set(newsId, { data: fallback, timestamp: Date.now() });
    }
    return fallback;
  }
}

function generateNewsHeuristic(item: Record<string, unknown>): NewsAiEvaluation {
  const newsId = Number(item.id || 0);
  const title = String(item.title || "NEPSE Bulletin");
  const summary = String(item.summary || "");
  const stance = (item.impact_stance as NewsAiEvaluation["impact_stance"]) || "NEUTRAL";
  const score = Number(item.impact_score ?? 0);
  const rec = String(item.action_recommendation || "HOLD & MONITOR");
  const symbols = Array.isArray(item.symbols) ? (item.symbols as string[]) : [];
  const sector = String(item.sector || "General Market");

  const symLabel = symbols.length > 0 ? symbols.join(", ") : sector;

  let playbook = "";
  let horizon = "SHORT TERM (1-3 MO)";
  const checklist: string[] = [];

  const baseSummary = summary ? `${summary.trim()} ` : "";

  if (stance === "BULLISH") {
    playbook = `${baseSummary}Positive catalyst confirmed for ${symLabel}. Recommendation is to ${rec}. Target entry on slight dips or opening auction pullback; do not chase extended intraday spikes.`;
    horizon = rec.includes("BOOK CLOSURE") ? "IMMEDIATE (1-5 DAYS)" : "SHORT TERM (1-3 MO)";
    checklist.push(`Verify book closure or dividend entitlement dates for ${symLabel}`);
    checklist.push("Confirm support levels on technical chart before placing limit orders");
    checklist.push("Review company quarterly financial disclosures and NPL trend");
  } else if (stance === "BEARISH") {
    playbook = `${baseSummary}Adverse headwind or regulatory caution impacting ${symLabel}. Recommendation is to ${rec}. Avoid aggressive bottom-fishing until selling volume normalizes and support is established.`;
    checklist.push(`Examine downside support levels for ${symLabel}`);
    checklist.push("Tighten stop-loss or reduce margin loan exposure");
    checklist.push("Wait for follow-up regulatory or board clarification");
  } else {
    playbook = `${baseSummary}Informative update for ${symLabel}. Recommendation is to HOLD & MONITOR. Impact is neutral to balanced; track secondary market response and volume before taking fresh positions.`;
    checklist.push(`Monitor daily turnover and breadth in ${sector}`);
    checklist.push("Check upcoming corporate announcements on ShareSansar / NEPSE");
    checklist.push("Maintain balanced asset allocation");
  }

  return {
    news_id: newsId,
    title,
    impact_stance: stance,
    impact_score: score,
    action_recommendation: rec,
    actionable_playbook: playbook,
    target_horizon: horizon,
    affected_symbols: symbols,
    affected_sectors: [sector],
    catalysts: [
      `Corporate and policy response for ${symLabel}`,
      "Monetary liquidity and market interest rate trends",
      "Next quarterly financial reporting cycle",
    ],
    risks_to_watch: [
      "Broad market sentiment and turnover fluctuations",
      "Regulatory adjustments by SEBON / NRB",
    ],
    investor_checklist: checklist,
    analyzed_at: new Date().toISOString(),
    source: "heuristic",
  };
}
