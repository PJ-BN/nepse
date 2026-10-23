import { getJson } from "@/shared/api/http";

// Client for the backend's NEPSE chart layers (/api/v1/nepse/*).
const BASE = "/api/v1/nepse";

export type CircuitLimit = { date: string; lower: number; upper: number };
export type CorporateAction = { date: string; fy: string; bonus_pct: number; cash_pct: number; right_ratio: string | null };
export type VolumeBin = { low: number; high: number; qty: number };
export type VolumeProfile = { bins: VolumeBin[]; poc: number | null };

const iso = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 10);

export function fetchCircuitLimits(symbol: string, from: number, to: number, adjusted: boolean) {
  const q = new URLSearchParams({ symbol, from: iso(from), to: iso(to), adjusted: String(adjusted) });
  return getJson<CircuitLimit[]>(`${BASE}/circuit-limits?${q}`);
}

export const fetchCorporateActions = (symbol: string) =>
  getJson<CorporateAction[]>(`${BASE}/corporate-actions?${new URLSearchParams({ symbol })}`);

export function fetchVolumeProfile(symbol: string, from: number, to: number, bins = 24) {
  const q = new URLSearchParams({ symbol, from: iso(from), to: iso(to), bins: String(bins) });
  return getJson<VolumeProfile>(`${BASE}/volume-profile?${q}`);
}
