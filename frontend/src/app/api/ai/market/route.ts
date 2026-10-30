import { NextRequest, NextResponse } from "next/server";
import { evaluateMarketWithAgy } from "@/features/ai/agyRunner";
import { getStoredAiEvaluation, saveStoredAiEvaluation } from "@/features/ai/dbStorage";
import type { MarketAiAnalysis } from "@/features/ai/types";
import { checkAiAuth, unauthorizedAiResponse } from "../authCheck";

const API_BASE = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(req: NextRequest) {
  if (!(await checkAiAuth(req))) {
    return unauthorizedAiResponse();
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const forceRefresh = searchParams.get("refresh") === "true";

    // 1. If not forcing refresh, return stored market evaluation from database
    if (!forceRefresh) {
      const stored = await getStoredAiEvaluation<MarketAiAnalysis>("market", "GLOBAL");
      if (stored) {
        return NextResponse.json(stored);
      }
    }

    // 2. Fetch market summary from backend API
    const res = await fetch(`${API_BASE}/api/v1/market/summary`, {
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      const fallbackStored = await getStoredAiEvaluation<MarketAiAnalysis>("market", "GLOBAL");
      if (fallbackStored) {
        return NextResponse.json(fallbackStored);
      }
      return NextResponse.json(
        { error: `Failed to fetch market summary: ${res.statusText}` },
        { status: res.status }
      );
    }

    const summary = (await res.json()) as Record<string, unknown>;
    const analysis = await evaluateMarketWithAgy(summary, forceRefresh);

    // 3. Persist newly generated market evaluation into PostgreSQL database
    await saveStoredAiEvaluation(
      "market",
      "GLOBAL",
      analysis,
      analysis.source || "agy",
      analysis.evaluated_at
    );

    return NextResponse.json(analysis);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("AI market analysis route error:", error);

    // Return previous stored data if available
    try {
      const stored = await getStoredAiEvaluation<MarketAiAnalysis>("market", "GLOBAL");
      if (stored) {
        return NextResponse.json(stored);
      }
    } catch {
      // ignore
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
