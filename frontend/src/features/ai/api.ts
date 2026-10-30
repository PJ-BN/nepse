import { getAuthToken } from "@/features/auth/tokenStorage";
import type { ChartAiAnalysis, CompanyAiEvaluation, MarketAiAnalysis } from "./types";

function getHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  const token = getAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

export async function fetchCompanyAiEvaluation(symbol: string, refresh = false): Promise<CompanyAiEvaluation> {
  const query = refresh ? "?refresh=true" : "";
  const res = await fetch(`/api/ai/company/${encodeURIComponent(symbol.toUpperCase())}${query}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to load AI evaluation for ${symbol} (${res.status})`);
  }
  return res.json();
}

export async function fetchMarketAiAnalysis(refresh = false): Promise<MarketAiAnalysis> {
  const query = refresh ? "?refresh=true" : "";
  const res = await fetch(`/api/ai/market${query}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to load AI market analysis (${res.status})`);
  }
  return res.json();
}

export async function fetchChartAiAnalysis(
  symbol: string,
  resolution = "1D",
  candles?: Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }>,
  refresh = false
): Promise<ChartAiAnalysis> {
  const query = refresh ? "?refresh=true" : "";
  const upper = encodeURIComponent(symbol.toUpperCase());
  let res: Response;

  if (candles && candles.length > 0) {
    res = await fetch(`/api/ai/chart/${upper}${query}`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ resolution, refresh, candles }),
    });
  } else {
    res = await fetch(`/api/ai/chart/${upper}?resolution=${resolution}${refresh ? "&refresh=true" : ""}`, {
      headers: getHeaders(),
    });
  }

  if (!res.ok) {
    throw new Error(`Failed to load AI chart analysis for ${symbol} (${res.status})`);
  }
  return res.json();
}
