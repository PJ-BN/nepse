import { NextRequest, NextResponse } from "next/server";
import { answerAgentQuery, DEFAULT_ANNOUNCEMENTS, DEFAULT_DIVIDENDS, DEFAULT_UNIVERSE, scanMarketUniverse } from "@/features/ai/agentEngine";
import { answerQueryWithAgy } from "@/features/ai/agentAgyRunner";
import { checkAiAuth, unauthorizedAiResponse } from "../../authCheck";

export async function POST(req: NextRequest) {
  if (!(await checkAiAuth(req))) {
    return unauthorizedAiResponse();
  }

  // Check and consume prompt quota via backend FastAPI
  const authHeader = req.headers.get("authorization");
  const API_BASE = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  let usageData: {
    allowed?: boolean;
    is_admin?: boolean;
    limit?: number | null;
    used?: number;
    remaining?: number | null;
    reset_date?: string;
  } | null = null;

  if (authHeader) {
    try {
      const limitRes = await fetch(`${API_BASE}/api/v1/ai/prompt-limit/consume`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });

      if (limitRes.status === 429) {
        const errPayload = await limitRes.json().catch(() => ({}));
        return NextResponse.json(
          {
            error: "Daily prompt limit reached",
            message:
              errPayload.detail ||
              "You have reached your daily limit of 5 prompts. Limits reset every day at midnight (NPT). Admin accounts enjoy unlimited access.",
            limit_reached: true,
            prompts_remaining: 0,
            limit: 5,
          },
          { status: 429 }
        );
      }

      if (limitRes.ok) {
        usageData = await limitRes.json().catch(() => null);
      }
    } catch (err) {
      console.warn("Failed to verify prompt quota with backend:", err);
      // Non-blocking: allow chat if quota service is temporarily unreachable
    }
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
      usage: usageData,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Agent chat error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
