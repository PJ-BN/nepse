"use client";

import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { API_URL } from "@/shared/api/http";
import type { LiveIndex, LiveMessage, LiveQuote, LiveTopic, MarketStatus, WhaleTrade } from "../types";

export const liveKeys = {
  quotes: ["live", "quotes"] as const,
  indices: ["live", "indices"] as const,
  status: ["live", "status"] as const,
  whales: ["live", "whales"] as const,
};

const TOPICS: LiveTopic[] = ["quote", "index", "status", "whale"];
const MAX_WHALES = 50;
const RECONNECT_MS = 3_000;
const WS_URL = `${API_URL.replace(/^http/, "ws")}/api/v1/ws/live`;

// One socket per tab, shared by every component that calls useLiveFeed().
let socket: WebSocket | null = null;
let users = 0;
let retry: ReturnType<typeof setTimeout> | undefined;

function mergeDiff<T>(prev: Record<string, T> | undefined, diff: Record<string, Partial<T>>): Record<string, T> {
  const next = { ...prev };
  for (const [k, v] of Object.entries(diff)) next[k] = { ...next[k], ...v } as T;
  return next;
}

function apply(qc: QueryClient, msg: LiveMessage) {
  switch (msg.topic) {
    case "snapshot":
      qc.setQueryData(liveKeys.quotes, msg.data.quotes);
      qc.setQueryData(liveKeys.indices, msg.data.indices);
      qc.setQueryData(liveKeys.status, msg.data.status);
      break;
    case "quote":
      qc.setQueryData<Record<string, LiveQuote>>(liveKeys.quotes, (p) => mergeDiff(p, msg.data));
      break;
    case "index":
      qc.setQueryData<Record<string, LiveIndex>>(liveKeys.indices, (p) => mergeDiff(p, msg.data));
      break;
    case "status":
      qc.setQueryData(liveKeys.status, typeof msg.data === "string" ? msg.data : msg.data.status);
      break;
    case "whale":
      qc.setQueryData<WhaleTrade[]>(liveKeys.whales, (p = []) => [msg.data, ...p].slice(0, MAX_WHALES));
      break;
  }
}

function connect(qc: QueryClient) {
  const ws = new WebSocket(WS_URL);
  ws.onopen = () => ws.send(JSON.stringify({ subscribe: TOPICS }));
  ws.onmessage = (e) => {
    try {
      apply(qc, JSON.parse(e.data) as LiveMessage);
    } catch {
      // ignore malformed frames
    }
  };
  ws.onclose = () => {
    if (socket !== ws) return;
    socket = null;
    if (users > 0) retry = setTimeout(() => (socket = connect(qc)), RECONNECT_MS);
  };
  return ws;
}

/** Keeps the shared live socket open while mounted; data lands in the TanStack Query cache under liveKeys. */
export function useLiveFeed() {
  const qc = useQueryClient();
  useEffect(() => {
    users++;
    socket ??= connect(qc);
    return () => {
      if (--users > 0) return;
      clearTimeout(retry);
      const ws = socket;
      socket = null;
      ws?.close();
    };
  }, [qc]);
}

// Readers: the cache is only ever written by the socket, so these never fetch.
function useLive<T>(key: readonly string[], empty: T): T {
  const { data } = useQuery<T>({ queryKey: key, queryFn: () => empty, staleTime: Infinity, gcTime: Infinity });
  return data ?? empty;
}

const NO_QUOTES: Record<string, LiveQuote> = {};
const NO_INDICES: Record<string, LiveIndex> = {};
const NO_WHALES: WhaleTrade[] = [];

export const useLiveQuotes = () => useLive(liveKeys.quotes, NO_QUOTES);
export const useLiveIndices = () => useLive(liveKeys.indices, NO_INDICES);
export const useLiveStatus = () => useLive<MarketStatus | null>(liveKeys.status, null);
export const useWhaleTrades = () => useLive(liveKeys.whales, NO_WHALES);
