import { NextRequest, NextResponse } from "next/server";
import { enhanceBriefingWithAgy } from "@/features/ai/agentAgyRunner";
import { saveStoredAiEvaluation } from "@/features/ai/dbStorage";
import { getLatestAgentScan } from "@/features/ai/marketScanService";
import { checkAiAuth, unauthorizedAiResponse } from "../../authCheck";

export async function GET(req: NextRequest) {
  const forceRefresh = req.nextUrl.searchParams.get("refresh") === "true";

  // 1. If not forcing refresh, return stored or live scan immediately to everyone
  if (!forceRefresh) {
    const scan = await getLatestAgentScan(false);
    return NextResponse.json(scan);
  }

  // Only force-refresh requests require authentication
  if (!(await checkAiAuth(req))) {
    return unauthorizedAiResponse();
  }

  try {
    const scan = await getLatestAgentScan(true);

    // Enhance briefing with AGY when available
    try {
      const enhancedBriefing = await enhanceBriefingWithAgy(scan, 20000);
      scan.briefing = enhancedBriefing;
      scan.source = "agy";
    } catch {
      scan.source = "heuristic";
    }

    // Persist newly generated agent scan into PostgreSQL database
    await saveStoredAiEvaluation(
      "agent_scan",
      "LATEST",
      scan,
      scan.source || "agy",
      scan.briefing?.evaluatedAt
    );

    return NextResponse.json(scan);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Agent scan error:", message);
    const fallbackScan = await getLatestAgentScan(false);
    return NextResponse.json(fallbackScan);
  }
}
