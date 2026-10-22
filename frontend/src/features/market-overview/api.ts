import { getJson } from "@/shared/api/http";
import type { MarketSummary } from "./types";

export const fetchMarketSummary = () => getJson<MarketSummary>("/api/v1/market/summary");
