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
  const topBuys = scan.topBuys.slice(0, 5).map((b) => `${b.symbol} (NPR ${b.close}, score: ${b.confidenceScore}, ${b.headlineReason})`).join("; ");
  const userList = userWatchlistSymbols.join(", ");

  const prompt = `You are the NEPSE AI Trading & Watchlist Agent integrated in the NEPSE Analytics platform.
The user is asking: "${query}"

CONTEXT:
- Total monitored stocks: ${scan.stocks.length}
- Current Market Regime: ${scan.briefing.marketRegime}
- Top Recommended Buys: ${topBuys}
- User's Personal Watchlist: ${userList || "None saved yet"}

INSTRUCTIONS:
- Directly answer the user's question with actionable, specific stock symbols and reasons.
- Categorize recommendations clearly: which to WATCHLIST, which to BUY, which to SELL.
- Highlight specific entry levels, catalysts (dividends, broker accumulation), or risk warnings.
- Keep the response concise, authoritative, and formatted cleanly in markdown with bullet points.
- Do NOT output disclaimers or generic chatter. Jump straight to the analysis.`;

  try {
    const raw = await runAgyPrompt(prompt, timeoutMs);
    return raw.trim();
  } catch (err) {
    console.warn("AGY conversational query failed, falling back to local deterministic answer:", err);
    return null;
  }
}
