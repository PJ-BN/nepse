import { NextRequest, NextResponse } from "next/server";
import { evaluateCompanyWithAgy } from "@/features/ai/agyRunner";
import { getStoredAiEvaluation, saveStoredAiEvaluation } from "@/features/ai/dbStorage";
import type { CompanyAiEvaluation } from "@/features/ai/types";
import { checkAiAuth, unauthorizedAiResponse } from "../../authCheck";

const API_BASE = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  if (!(await checkAiAuth(req))) {
    return unauthorizedAiResponse();
  }

  try {
    const { symbol } = await params;
    const searchParams = req.nextUrl.searchParams;
    const forceRefresh = searchParams.get("refresh") === "true";

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }

    const upper = symbol.toUpperCase().trim();

    // 1. If not forcing a refresh, return stored evaluation from database immediately
    if (!forceRefresh) {
      const stored = await getStoredAiEvaluation<CompanyAiEvaluation>("company", upper);
      if (stored) {
        return NextResponse.json(stored);
      }
    }

    // 2. Fetch company full details from backend API
    const res = await fetch(`${API_BASE}/api/v1/company/${encodeURIComponent(upper)}/full`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const fallbackStored = await getStoredAiEvaluation<CompanyAiEvaluation>("company", upper);
      if (fallbackStored) {
        return NextResponse.json(fallbackStored);
      }
      return NextResponse.json(
        { error: `Failed to fetch company data for ${symbol}: ${res.statusText}` },
        { status: res.status }
      );
    }

    const companyData = (await res.json()) as Record<string, unknown>;
    const evaluation = await evaluateCompanyWithAgy(companyData, forceRefresh);

    // 3. Persist newly generated evaluation into PostgreSQL database
    await saveStoredAiEvaluation(
      "company",
      upper,
      evaluation,
      evaluation.source || "agy",
      evaluation.evaluated_at
    );

    return NextResponse.json(evaluation);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("AI company evaluation route error:", error);

    // If an error occurred, check if we have a previous evaluation in DB
    try {
      const { symbol } = await params;
      if (symbol) {
        const stored = await getStoredAiEvaluation<CompanyAiEvaluation>("company", symbol.toUpperCase());
        if (stored) {
          return NextResponse.json(stored);
        }
      }
    } catch {
      // ignore
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
