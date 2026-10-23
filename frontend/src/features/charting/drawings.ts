import type { Chart, OverlayCreate } from "klinecharts";

const key = (symbol: string) => `nepse:drawings:${symbol}`;

export type Drawing = Pick<OverlayCreate, "name" | "points" | "lock" | "visible" | "mode" | "styles" | "extendData">;

export function loadDrawings(symbol: string): Drawing[] {
  try {
    return JSON.parse(localStorage.getItem(key(symbol)) ?? "[]");
  } catch {
    return [];
  }
}

/** Persist every overlay currently on the chart (pass a symbol; no-op without one). */
export function saveDrawings(symbol: string, chart: Chart) {
  if (!symbol) return;
  const drawings: Drawing[] = chart
    .getOverlays()
    .filter((o) => o.currentStep === o.totalStep || o.totalStep === 0) // skip half-drawn ones
    .map(({ name, points, lock, visible, mode, styles, extendData }) => ({ name, points, lock, visible, mode, styles, extendData }));
  try {
    localStorage.setItem(key(symbol), JSON.stringify(drawings));
  } catch {
    // storage unavailable (private window, quota) — drawings just won't persist
  }
}
