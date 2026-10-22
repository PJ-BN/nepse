import { API_URL, getJson } from "@/shared/api/http";
import type { Preset, ScreenerRequest, ScreenerResult } from "./types";

const BASE = "/api/v1/screener";

const post = (body: object): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const runScreener = (req: ScreenerRequest) => getJson<ScreenerResult>(`${BASE}/run`, post(req));

export const fetchPresets = () => getJson<Preset[]>(`${BASE}/presets`);

export async function downloadCsv(req: ScreenerRequest) {
  const res = await fetch(`${API_URL}${BASE}/run`, post({ ...req, limit: 1000, format: "csv" }));
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = "screener.csv";
  a.click();
  URL.revokeObjectURL(url);
}
