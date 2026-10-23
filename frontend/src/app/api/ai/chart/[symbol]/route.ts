import { NextRequest, NextResponse } from "next/server";
import { evaluateChartWithAgy, type CandleRecord } from "@/features/ai/agyRunner";

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
  try {
    const { symbol } = await params;
    const searchParams = req.nextUrl.searchParams;
    const resolution = searchParams.get("resolution") || "1D";
    const forceRefresh = searchParams.get("refresh") === "true";

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }

    const candles = await fetchCandlesFromUdf(symbol, resolution);
    const analysis = await evaluateChartWithAgy(symbol, candles, resolution, forceRefresh);

    return NextResponse.json(analysis);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("AI chart analysis route error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      candles?: CandleRecord[];
      resolution?: string;
      refresh?: boolean;
    };

    const resolution = body.resolution || "1D";
    const forceRefresh = Boolean(body.refresh);

    let candles = body.candles;
    if (!candles || candles.length === 0) {
      candles = await fetchCandlesFromUdf(symbol, resolution);
    }

    const analysis = await evaluateChartWithAgy(symbol, candles, resolution, forceRefresh);
    return NextResponse.json(analysis);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("AI chart analysis route POST error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
