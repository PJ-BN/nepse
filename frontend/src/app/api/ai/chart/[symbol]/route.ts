import { NextRequest, NextResponse } from "next/server";
import { evaluateChartWithAgy, type CandleRecord } from "@/features/ai/agyRunner";
import { getStoredAiEvaluation, saveStoredAiEvaluation } from "@/features/ai/dbStorage";
import type { ChartAiAnalysis } from "@/features/ai/types";
import { checkAiAuth, unauthorizedAiResponse } from "../../authCheck";

const API_BASE = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchCandlesFromUdf(symbol: string, resolution = "1D"): Promise<CandleRecord[]> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 365 * 86400 * 2; // past 2 years
  const url = `${API_BASE}/api/v1/udf/history?symbol=${encodeURIComponent(
    symbol.toUpperCase()
  )}&resolution=${resolution}&from=${from}&to=${to}&adjusted=true`;

  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return [];

  const data = await res.json();
  if (data.s !== "ok" || !Array.isArray(data.t)) return [];

  return data.t.map((t: number, i: number) => ({
    time: t,
    open: Number(data.o[i] ?? 0),
    high: Number(data.h[i] ?? 0),
    low: Number(data.l[i] ?? 0),
    close: Number(data.c[i] ?? 0),
    volume: Number(data.v[i] ?? 0),
  }));
}

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
    const resolution = searchParams.get("resolution") || "1D";
    const forceRefresh = searchParams.get("refresh") === "true";

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }

    const upper = symbol.toUpperCase().trim();
    const entityKey = `${upper}:${resolution}`;

    // 1. If not forcing refresh, return stored evaluation from database
    if (!forceRefresh) {
      const stored = await getStoredAiEvaluation<ChartAiAnalysis>("chart", entityKey);
      if (stored) {
        return NextResponse.json(stored);
      }
    }

    const candles = await fetchCandlesFromUdf(upper, resolution);
    const analysis = await evaluateChartWithAgy(upper, candles, resolution, forceRefresh);

    // 2. Persist newly generated evaluation into PostgreSQL database
    await saveStoredAiEvaluation("chart", entityKey, analysis, analysis.source || "agy", analysis.evaluated_at);

    return NextResponse.json(analysis);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("AI chart analysis route error:", error);

    // Return previous stored data if available
    try {
      const { symbol } = await params;
      const searchParams = req.nextUrl.searchParams;
      const resolution = searchParams.get("resolution") || "1D";
      if (symbol) {
        const stored = await getStoredAiEvaluation<ChartAiAnalysis>("chart", `${symbol.toUpperCase()}:${resolution}`);
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  if (!(await checkAiAuth(req))) {
    return unauthorizedAiResponse();
  }

  try {
    const { symbol } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      candles?: CandleRecord[];
      resolution?: string;
      refresh?: boolean;
    };

    const resolution = body.resolution || "1D";
    const forceRefresh = Boolean(body.refresh);
    const upper = symbol.toUpperCase().trim();
    const entityKey = `${upper}:${resolution}`;

    // 1. Check stored evaluation in DB if not refreshing
    if (!forceRefresh) {
      const stored = await getStoredAiEvaluation<ChartAiAnalysis>("chart", entityKey);
      if (stored) {
        return NextResponse.json(stored);
      }
    }

    let candles = body.candles;
    if (!candles || candles.length === 0) {
      candles = await fetchCandlesFromUdf(upper, resolution);
    }

    const analysis = await evaluateChartWithAgy(upper, candles, resolution, forceRefresh);

    // 2. Persist to PostgreSQL database
    await saveStoredAiEvaluation("chart", entityKey, analysis, analysis.source || "agy", analysis.evaluated_at);

    return NextResponse.json(analysis);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("AI chart analysis route POST error:", error);

    try {
      const { symbol } = await params;
      if (symbol) {
        const stored = await getStoredAiEvaluation<ChartAiAnalysis>("chart", `${symbol.toUpperCase()}:1D`);
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
