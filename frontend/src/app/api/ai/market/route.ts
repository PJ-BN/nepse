import { NextRequest, NextResponse } from "next/server";
import { evaluateMarketWithAgy } from "@/features/ai/agyRunner";

const API_BASE = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const forceRefresh = searchParams.get("refresh") === "true";

    // Fetch market summary from backend API
    const res = await fetch(`${API_BASE}/api/v1/market/summary`, {
      next: { revalidate: 30 }
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch market summary: ${res.statusText}` },
        { status: res.status }
      );
    }

    const summary = (await res.json()) as Record<string, unknown>;
    const analysis = await evaluateMarketWithAgy(summary, forceRefresh);

    return NextResponse.json(analysis);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("AI market analysis route error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
