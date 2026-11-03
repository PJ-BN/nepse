import { runAgyPrompt } from "./agyRunner";
import type { AgentScanResult, MarketAgentBriefing } from "./agentTypes";

function cleanJson(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

/**
 * Enhances the quantitative market briefing using AGY LLM when available.
 */
export async function enhanceBriefingWithAgy(
  scan: AgentScanResult,
  timeoutMs = 45000
): Promise<MarketAgentBriefing> {
  const topBuys = scan.topBuys.map((b) => `${b.symbol} (Score: ${b.confidenceScore}, ${b.headlineReason})`).join(", ");
  const topWatch = scan.topWatchlist.map((w) => `${w.symbol} (${w.headlineReason})`).join(", ");
  const topSells = scan.topSells.map((s) => `${s.symbol} (${s.headlineReason})`).join(", ");

  const prompt = `You are the Chief Investment Officer and Quantitative Research Head covering the Nepal Stock Exchange (NEPSE).
Synthesize this real-time multi-factor market scan of ${scan.stocks.length} equities into a concise, actionable executive briefing for active traders.

DATA SUMMARY:
- Scanned Universe: ${scan.stocks.length} equities
- Action Counts: ${scan.briefing.buyCount} Buys, ${scan.briefing.watchlistCount} Watchlist setups, ${scan.briefing.sellCount} Sells/Avoids
- Base Market Regime: ${scan.briefing.marketRegime}
- Top Scored Sector: ${scan.briefing.topSectorPick}
- Top High-Conviction Buys: ${topBuys}
- Top Watchlist Setups: ${topWatch}
- Top Risk / Sell Alerts: ${topSells}

REQUIREMENTS:
1. Provide an executive summary of current NEPSE dynamics (institutional flow, retail sentiment, market breadth).
2. Clarify whether traders should be aggressive, selective, or defensive.
3. Suggest the top sector and primary tactical strategy.

Respond with ONLY a raw JSON object (valid JSON, no markdown backticks, no comments):
{
  "marketRegime": "${scan.briefing.marketRegime}",
  "confidenceScore": ${scan.briefing.confidenceScore},
  "executiveBrief": "sharp 2-3 sentence executive market pulse",
  "topSectorPick": "${scan.briefing.topSectorPick}",
  "tacticalStrategy": "1-2 sentence direct tactical playbook for retail and swing traders"
}`;

  try {
    const rawOut = await runAgyPrompt(prompt, timeoutMs);
    const parsed = JSON.parse(cleanJson(rawOut)) as Record<string, unknown>;

    return {
      ...scan.briefing,
      marketRegime: (parsed.marketRegime as MarketAgentBriefing["marketRegime"]) || scan.briefing.marketRegime,
      confidenceScore: typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : scan.briefing.confidenceScore,
      executiveBrief: typeof parsed.executiveBrief === "string" && parsed.executiveBrief.length > 20
        ? parsed.executiveBrief
        : scan.briefing.executiveBrief,
      topSectorPick: typeof parsed.topSectorPick === "string" ? parsed.topSectorPick : scan.briefing.topSectorPick,
      tacticalStrategy: typeof parsed.tacticalStrategy === "string" && parsed.tacticalStrategy.length > 15
        ? parsed.tacticalStrategy
        : scan.briefing.tacticalStrategy,
    };
  } catch (err) {
    console.warn("AGY market briefing enhancement failed, retaining quantitative heuristic briefing:", err);
    return scan.briefing;
  }
}

/**
 * Uses AGY to answer custom user questions about stocks with context from the scan.
 */
export async function answerQueryWithAgy(
  query: string,
  scan: AgentScanResult,
  userWatchlistSymbols: string[] = [],
  timeoutMs = 45000
): Promise<string | null> {
  const qUpper = query.toUpperCase();
  // Identify any specific stocks mentioned in the user query (whole-word check)
  const mentionedStocks = scan.stocks.filter((s) => {
    const rx = new RegExp(`(^|[^A-Z0-9])${s.symbol}([^A-Z0-9]|$)`);
    return rx.test(qUpper);
  });

  let targetDetails = "";
  if (mentionedStocks.length > 0) {
    targetDetails =
      `\nSPECIFIC EQUITIES MENTIONED IN QUERY:\n` +
      mentionedStocks
        .map(
          (s) => `
- ${s.symbol} (${s.name}, Sector: ${s.sector}):
  * Current LTP: NPR ${s.close} (${s.changePct >= 0 ? "+" : ""}${s.changePct}%)
  * Model Action Rating: ${s.action} (Confluence Score: ${s.confidenceScore}/100)
  * Headline Rationale: ${s.headlineReason}
  * Technical Status: RSI(14)=${s.rsi14.toFixed(1)}, SMA Position=${s.smaPosition}, 52W Range=${s.range52wPct}% (52W High: NPR ${s.high52w}, 52W Low: NPR ${s.low52w})
  * Smart Money Flow: Top 3 broker accumulation ${s.brokerAccumulationPct.toFixed(1)}%
  * Catalysts: ${s.catalysts.map((c) => c.headline).join("; ") || "None"}
  ${s.tradePlan ? `* Trade Plan: Entry NPR ${s.tradePlan.entryMin} - ${s.tradePlan.entryMax}, Stop Loss NPR ${s.tradePlan.stopLoss}, Target 1 NPR ${s.tradePlan.target1}` : ""}`
        )
        .join("\n");
  }

  const topBuys = scan.topBuys
    .slice(0, 5)
    .map((b) => `${b.symbol} (NPR ${b.close}, ${b.action}, score: ${b.confidenceScore}, ${b.headlineReason})`)
    .join("; ");
  const topSells = scan.topSells
    .slice(0, 5)
    .map((s) => `${s.symbol} (NPR ${s.close}, ${s.action}, score: ${s.confidenceScore}, ${s.headlineReason})`)
    .join("; ");
  const userList = userWatchlistSymbols.join(", ");

  const prompt = `You are the NEPSE AI Trading & Watchlist Agent integrated in the NEPSE Analytics platform.
The user is asking: "${query}"

LIVE MARKET CONTEXT (NEPSE Real-Time Data):
- Total Monitored Stocks: ${scan.stocks.length}
- Current Market Regime: ${scan.briefing.marketRegime}
- Top Recommended Buys: ${topBuys || "None"}
- Top Overbought / Caution / Sells: ${topSells || "None"}
- User's Personal Watchlist: ${userList || "None saved yet"}
${targetDetails}

INSTRUCTIONS:
- You MUST strictly use the exact stock prices (LTP), ratings (BUY, SELL, WATCHLIST), technical metrics, and catalysts provided in the LIVE MARKET CONTEXT above.
- NEVER invent or assume different prices, dividend percentages, or ratings that contradict the CONTEXT.
- If a stock is rated SELL or AVOID (e.g. overbought with high RSI), explicitly advise caution/taking profits and explain why based on its actual metrics.
- If a stock is rated BUY, provide its clear entry zone and target from the context.
- Keep the response authoritative, structured in markdown, and concise. Jump straight into the analysis without disclaimers.`;

  try {
    const raw = await runAgyPrompt(prompt, timeoutMs);
    return raw.trim();
  } catch (err) {
    console.warn("AGY conversational query failed, falling back to local deterministic answer:", err);
    return null;
  }
}
