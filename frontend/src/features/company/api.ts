import { getJson } from "@/shared/api/http";
import type { CompanyFull } from "./types";

export type DcfParams = { dcf_growth?: number; risk_free_rate?: number; terminal_growth?: number };

export const fetchCompanyFull = (symbol: string, dcf: DcfParams = {}) =>
  getJson<CompanyFull>(`/api/v1/company/${encodeURIComponent(symbol.toUpperCase())}/full?${new URLSearchParams(Object.entries(dcf).map(([k, v]) => [k, String(v)]))}`);

export const refreshCompany = (symbol: string) =>
  getJson<unknown>(`/api/v1/company/${encodeURIComponent(symbol.toUpperCase())}/refresh`, { method: "POST" });
