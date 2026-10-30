import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_ANNOUNCEMENTS,
  DEFAULT_DIVIDENDS,
  DEFAULT_UNIVERSE,
  RawAnnouncement,
  RawDividend,
  RawStockSnapshot,
  scanMarketUniverse,
} from "@/features/ai/agentEngine";
import { enhanceBriefingWithAgy } from "@/features/ai/agentAgyRunner";
import { getStoredAiEvaluation, saveStoredAiEvaluation } from "@/features/ai/dbStorage";
import type { AgentScanResult } from "@/features/ai/agentTypes";
import { checkAiAuth, unauthorizedAiResponse } from "../../authCheck";

const API_BASE = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchScreenerStocks(): Promise<RawStockSnapshot[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/screener/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 500 }),
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return DEFAULT_UNIVERSE;
    const data = await res.json();
    if (Array.isArray(data.rows) && data.rows.length > 0) {
      return data.rows as RawStockSnapshot[];
    }
  } catch {
    // Backend API offline / empty, fall back cleanly
  }
  return DEFAULT_UNIVERSE;
}

async function fetchAnnouncements(): Promise<RawAnnouncement[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/calendar/announcements?limit=100`, {
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return DEFAULT_ANNOUNCEMENTS;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data as RawAnnouncement[];
    }
  } catch {
    // Fall back to default announcements
  }
  return DEFAULT_ANNOUNCEMENTS;
}

async function fetchDividends(): Promise<RawDividend[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/calendar/dividends?limit=100`, {
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return DEFAULT_DIVIDENDS;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data as RawDividend[];
    }
  } catch {
    // Fall back to default dividends
  }
  return DEFAULT_DIVIDENDS;
}

export async function GET(req: NextRequest) {
  if (!(await checkAiAuth(req))) {
    return unauthorizedAiResponse();
  }

  try {
    const forceRefresh = req.nextUrl.searchParams.get("refresh") === "true";

    // 1. If not forcing refresh, return stored scan from database immediately
    if (!forceRefresh) {
      const stored = await getStoredAiEvaluation<AgentScanResult>("agent_scan", "LATEST");
      if (stored) {
        return NextResponse.json(stored);
      }
    }

    const [stocks, announcements, dividends] = await Promise.all([
      fetchScreenerStocks(),
      fetchAnnouncements(),
      fetchDividends(),
    ]);

    const scan = scanMarketUniverse(stocks, announcements, dividends);

    // Enhance briefing with AGY when available
    try {
      const enhancedBriefing = await enhanceBriefingWithAgy(scan, 20000);
      scan.briefing = enhancedBriefing;
      scan.source = "agy";
    } catch {
      scan.source = "heuristic";
    }

    // 2. Persist newly generated agent scan into PostgreSQL database
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

    // Fall back to stored scan in database if available
    try {
      const stored = await getStoredAiEvaluation<AgentScanResult>("agent_scan", "LATEST");
      if (stored) {
        return NextResponse.json(stored);
      }
    } catch {
      // ignore
    }

    const fallbackScan = scanMarketUniverse(DEFAULT_UNIVERSE, DEFAULT_ANNOUNCEMENTS, DEFAULT_DIVIDENDS);
    return NextResponse.json(fallbackScan);
  }
}
