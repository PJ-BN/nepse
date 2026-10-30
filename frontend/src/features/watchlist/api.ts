import type { AgentScanResult, StockAgentEvaluation } from "@/features/ai/agentTypes";
import { getJson, postJson, putJson, deleteJson } from "@/shared/api/http";

export async function fetchUserWatchlist(): Promise<string[]> {
  return getJson<string[]>("/api/v1/user/watchlist");
}

export async function addUserWatchlistSymbol(symbol: string): Promise<string[]> {
  return postJson<string[]>("/api/v1/user/watchlist", { symbol });
}

export async function removeUserWatchlistSymbol(symbol: string): Promise<string[]> {
  return deleteJson<string[]>(`/api/v1/user/watchlist/${encodeURIComponent(symbol)}`);
}

export async function syncUserWatchlist(symbols: string[]): Promise<string[]> {
  return putJson<string[]>("/api/v1/user/watchlist", { symbols });
}

export async function fetchAgentScan(forceRefresh = false): Promise<AgentScanResult> {
  const url = `/api/ai/agent/scan${forceRefresh ? "?refresh=true" : ""}`;
  return getJson<AgentScanResult>(url);
}

export async function sendAgentMessage(
  query: string,
  watchlistSymbols: string[] = []
): Promise<{ answer: string; recommendedStocks: StockAgentEvaluation[]; timestamp: string }> {
  return postJson<{ answer: string; recommendedStocks: StockAgentEvaluation[]; timestamp: string }>(
    "/api/ai/agent/chat",
    { query, watchlistSymbols }
  );
}
