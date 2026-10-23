import { NextRequest, NextResponse } from "next/server";
import { evaluateCompanyWithAgy } from "@/features/ai/agyRunner";

const API_BASE = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const searchParams = req.nextUrl.searchParams;
    const forceRefresh = searchParams.get("refresh") === "true";

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }

    // Fetch company full details from backend API
    const res = await fetch(`${API_BASE}/api/v1/company/${encodeURIComponent(symbol.toUpperCase())}/full`, {
      next: { revalidate: 60 }
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch company data for ${symbol}: ${res.statusText}` },
        { status: res.status }
      );
    }

    const companyData = (await res.json()) as Record<string, unknown>;
    const evaluation = await evaluateCompanyWithAgy(companyData, forceRefresh);

    return NextResponse.json(evaluation);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("AI company evaluation route error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
