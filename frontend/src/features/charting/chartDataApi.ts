import { getJson, putJson, deleteJson } from "@/shared/api/http";
import type { Drawing } from "./drawings";
import type { ChartSettings, Layouts } from "./settings";

export async function fetchCloudDrawings(symbol: string): Promise<Drawing[]> {
  try {
    return await getJson<Drawing[]>(`/api/v1/user/chart/drawings/${encodeURIComponent(symbol)}`);
  } catch (err) {
    console.warn(`Failed to fetch cloud drawings for ${symbol}:`, err);
    return [];
  }
}

export async function saveCloudDrawings(symbol: string, drawings: Drawing[]): Promise<Drawing[]> {
  return putJson<Drawing[]>(`/api/v1/user/chart/drawings/${encodeURIComponent(symbol)}`, { drawings });
}

export async function deleteCloudDrawings(symbol: string): Promise<void> {
  await deleteJson<{ deleted: boolean }>(`/api/v1/user/chart/drawings/${encodeURIComponent(symbol)}`);
}

export async function fetchCloudLayouts(): Promise<Layouts> {
  try {
    return await getJson<Layouts>("/api/v1/user/chart/layouts");
  } catch (err) {
    console.warn("Failed to fetch cloud layouts:", err);
    return {};
  }
}

export async function saveCloudLayout(name: string, settings: ChartSettings): Promise<Layouts> {
  return putJson<Layouts>(`/api/v1/user/chart/layouts/${encodeURIComponent(name)}`, { settings });
}

export async function deleteCloudLayout(name: string): Promise<Layouts> {
  return deleteJson<Layouts>(`/api/v1/user/chart/layouts/${encodeURIComponent(name)}`);
}

export async function syncCloudLayouts(layouts: Layouts): Promise<Layouts> {
  return putJson<Layouts>("/api/v1/user/chart/layouts", { layouts });
}
