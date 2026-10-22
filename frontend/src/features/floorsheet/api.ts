import { getJson } from "@/shared/api/http";
import type { AccumulationHit, BrokerAnalytics, WhaleEvent } from "./types";

const BASE = "/api/v1/floorsheet";

export const fetchAnalytics = (symbol: string, days: number, brokerNo?: number) =>
  getJson<BrokerAnalytics>(
    `${BASE}/analytics?${new URLSearchParams({
      symbol,
      days: String(days),
      ...(brokerNo ? { broker_no: String(brokerNo) } : {}),
    })}`,
  );

export const fetchWhales = (symbol?: string) =>
  getJson<WhaleEvent[]>(`${BASE}/whales${symbol ? `?symbol=${encodeURIComponent(symbol)}` : ""}`);

export const fetchAccumulation = () => getJson<AccumulationHit[]>(`${BASE}/accumulation`);
