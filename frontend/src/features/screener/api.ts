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

async function download(req: ScreenerRequest, format: "csv" | "xlsx") {
  const res = await fetch(`${API_URL}${BASE}/run`, post({ ...req, limit: 1000, format }));
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = `screener.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

export const downloadCsv = (req: ScreenerRequest) => download(req, "csv");
export const downloadXlsx = (req: ScreenerRequest) => download(req, "xlsx");
