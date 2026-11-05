import {
  DEFAULT_ANNOUNCEMENTS,
  DEFAULT_DIVIDENDS,
  DEFAULT_UNIVERSE,
  RawAnnouncement,
  RawDividend,
  RawStockSnapshot,
  scanMarketUniverse,
} from "./agentEngine";
import { getStoredAiEvaluation, saveStoredAiEvaluation } from "./dbStorage";
import type { AgentScanResult } from "./agentTypes";

const API_BASE = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchScreenerStocks(): Promise<RawStockSnapshot[]> {
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

export async function fetchAnnouncements(): Promise<RawAnnouncement[]> {
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

export async function fetchDividends(): Promise<RawDividend[]> {
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

/**
 * Returns the latest comprehensive AI agent market scan.
 * Prioritizes the persisted PostgreSQL scan; if absent, computes a live scan
 * from backend screener & calendar data and caches it.
 */
export async function getLatestAgentScan(forceRefresh = false): Promise<AgentScanResult> {
  // 1. If not forcing refresh, return stored scan from database if valid and populated
  if (!forceRefresh) {
    try {
      const stored = await getStoredAiEvaluation<AgentScanResult>("agent_scan", "LATEST");
      if (stored && Array.isArray(stored.stocks) && stored.stocks.length > 0) {
        return stored;
      }
    } catch (err) {
      console.warn("Could not load stored agent scan:", err);
    }
  }

  // 2. Fetch live data from backend screener & calendar endpoints
  try {
    const [stocks, announcements, dividends] = await Promise.all([
      fetchScreenerStocks(),
      fetchAnnouncements(),
      fetchDividends(),
    ]);

    if (Array.isArray(stocks) && stocks.length > 0) {
      const scan = scanMarketUniverse(stocks, announcements, dividends);

      // Persist generated scan to database for instant future retrieval
      try {
        await saveStoredAiEvaluation(
          "agent_scan",
          "LATEST",
          scan,
          scan.source || "heuristic",
          scan.briefing?.evaluatedAt
        );
      } catch (saveErr) {
        console.warn("Could not cache agent scan to db:", saveErr);
      }

      return scan;
    }
  } catch (err) {
    console.warn("Live agent scan generation failed:", err);
  }

  // 3. Fallback to default universe only if backend is completely unreachable
  return scanMarketUniverse(DEFAULT_UNIVERSE, DEFAULT_ANNOUNCEMENTS, DEFAULT_DIVIDENDS);
}
