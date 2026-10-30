import { NextRequest, NextResponse } from "next/server";
import { answerAgentQuery, DEFAULT_ANNOUNCEMENTS, DEFAULT_DIVIDENDS, DEFAULT_UNIVERSE, scanMarketUniverse } from "@/features/ai/agentEngine";
import { answerQueryWithAgy } from "@/features/ai/agentAgyRunner";
import { checkAiAuth, unauthorizedAiResponse } from "../../authCheck";

export async function POST(req: NextRequest) {
  if (!(await checkAiAuth(req))) {
    return unauthorizedAiResponse();
  }

  try {
    const body = await req.json().catch(() => ({}));
    const query = String(body.query || "").trim();
    const watchlistSymbols = Array.isArray(body.watchlistSymbols)
      ? body.watchlistSymbols.map((s: unknown) => String(s).toUpperCase())
      : [];

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Run rapid scan
    const scan = scanMarketUniverse(DEFAULT_UNIVERSE, DEFAULT_ANNOUNCEMENTS, DEFAULT_DIVIDENDS);

    // First get deterministic matches & recommendations
    const heuristic = answerAgentQuery(query, scan, watchlistSymbols);

    // Try enhancing answer narrative with AGY LLM
    let narrative = heuristic.answer;
    try {
      const agyText = await answerQueryWithAgy(query, scan, watchlistSymbols, 25000);
      if (agyText && agyText.length > 30) {
        narrative = agyText;
      }
    } catch {
      // Retain heuristic narrative
    }

    return NextResponse.json({
      answer: narrative,
      recommendedStocks: heuristic.recommendedStocks,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Agent chat error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
