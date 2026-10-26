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
import type { AgentScanResult } from "@/features/ai/agentTypes";

const API_BASE = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let cachedResult: { data: AgentScanResult; timestamp: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

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
  try {
    const forceRefresh = req.nextUrl.searchParams.get("refresh") === "true";

    if (!forceRefresh && cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL) {
      return NextResponse.json(cachedResult.data);
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

    cachedResult = {
      data: scan,
      timestamp: Date.now(),
    };

    return NextResponse.json(scan);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Agent scan error:", message);
    // Return fallback scan
    const fallbackScan = scanMarketUniverse(DEFAULT_UNIVERSE, DEFAULT_ANNOUNCEMENTS, DEFAULT_DIVIDENDS);
    return NextResponse.json(fallbackScan);
  }
}
