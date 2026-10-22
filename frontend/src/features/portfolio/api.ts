import { API_URL, getJson } from "@/shared/api/http";
import type { CalcInput, CalcResult, Holding, Realized, Txn, TxnInput } from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// POSTs surface FastAPI's `detail` (validation reasons) instead of a bare status line.
async function postJson<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data?.detail;
    const msg = Array.isArray(detail) ? detail.map((d) => d.msg).join("; ") : detail ?? res.statusText;
    throw new ApiError(res.status, String(msg));
  }
  return data as T;
}

const authed = <T>(path: string, token: string) =>
  getJson<T>(path, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });

export const login = (email: string, password: string) =>
  postJson<{ access_token: string }>("/api/v1/auth/login", { email, password });
export const register = (email: string, password: string) =>
  postJson<{ access_token: string }>("/api/v1/auth/register", { email, password });

export const fetchHoldings = (token: string) => authed<Holding[]>("/api/v1/portfolio/holdings", token);
export const fetchRealized = (token: string) => authed<Realized>("/api/v1/portfolio/realized", token);
export const addTxn = (token: string, txn: TxnInput) => postJson<Txn>("/api/v1/portfolio/txns", txn, token);
export const calc = (input: CalcInput) => postJson<CalcResult>("/api/v1/portfolio/calc", input);
