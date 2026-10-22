import { getJson } from "@/shared/api/http";
import type { CompanyFull } from "./types";

export const fetchCompanyFull = (symbol: string) =>
  getJson<CompanyFull>(`/api/v1/company/${encodeURIComponent(symbol.toUpperCase())}/full`);

export const refreshCompany = (symbol: string) =>
  getJson<unknown>(`/api/v1/company/${encodeURIComponent(symbol.toUpperCase())}/refresh`, { method: "POST" });
