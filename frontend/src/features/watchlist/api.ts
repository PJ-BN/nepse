import type { AgentScanResult, StockAgentEvaluation } from "@/features/ai/agentTypes";

export async function fetchAgentScan(forceRefresh = false): Promise<AgentScanResult> {
  const url = `/api/ai/agent/scan${forceRefresh ? "?refresh=true" : ""}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch agent market scan: ${res.statusText}`);
  }
  return res.json() as Promise<AgentScanResult>;
}

export async function sendAgentMessage(
  query: string,
  watchlistSymbols: string[] = []
): Promise<{ answer: string; recommendedStocks: StockAgentEvaluation[]; timestamp: string }> {
  const res = await fetch("/api/ai/agent/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, watchlistSymbols }),
  });
  if (!res.ok) {
    throw new Error(`Agent query failed: ${res.statusText}`);
  }
  return res.json();
}
