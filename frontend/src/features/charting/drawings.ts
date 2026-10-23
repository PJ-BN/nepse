import type { Chart, OverlayCreate } from "klinecharts";

/** `tf` is the timeframe a drawing belongs to, or ALL_TF when it shows on every timeframe. */
export type Drawing = Pick<OverlayCreate, "name" | "points" | "lock" | "mode" | "styles" | "extendData"> & { tf?: string };

export const ALL_TF = "*";
const key = (symbol: string) => `nepse:drawings:v2:${symbol}`;
const legacyKey = (symbol: string) => `nepse:drawings:${symbol}`;

const parse = (raw: string | null): Drawing[] | null => {
  try {
    const v = raw && JSON.parse(raw);
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
};

/**
 * Stored drawings for a symbol, all timeframes. Data saved before timeframes existed (the legacy key, no `tf`)
 * was shown everywhere, so it migrates to ALL_TF. The legacy key is left in place.
 */
export function parseStored(v2: string | null, legacy: string | null): Drawing[] {
  return parse(v2) ?? (parse(legacy) ?? []).map((d) => ({ ...d, tf: d.tf ?? ALL_TF }));
}

export function loadStored(symbol: string): Drawing[] {
  try {
    return parseStored(localStorage.getItem(key(symbol)), localStorage.getItem(legacyKey(symbol)));
  } catch {
    return [];
  }
}

export const loadDrawings = (symbol: string, tf: string) => loadStored(symbol).filter((d) => d.tf === tf || d.tf === ALL_TF);

/** Replace what's stored for this timeframe (and the all-timeframe ones) with `shown`; other timeframes stay. */
export const mergeDrawings = (stored: Drawing[], tf: string, shown: Drawing[]): Drawing[] => [
  ...stored.filter((d) => d.tf !== tf && d.tf !== ALL_TF),
  ...shown,
];

export function saveDrawings(symbol: string, tf: string, shown: Drawing[]) {
  if (!symbol) return;
  try {
    localStorage.setItem(key(symbol), JSON.stringify(mergeDrawings(loadStored(symbol), tf, shown)));
  } catch {
    // storage unavailable (private window, quota) — drawings just won't persist
  }
}

/** The finished drawings on the chart, in z-order; `allIds` are the ones shown on every timeframe. */
export function snapshot(chart: Chart, tf: string, allIds: Set<string>): (Drawing & { id: string })[] {
  return chart
    .getOverlays()
    .filter((o) => o.currentStep === -1 && o.groupId !== "vwap")
    .map(({ id, name, points, lock, mode, styles, extendData }) => ({ id, name, points, lock, mode, styles, extendData, tf: allIds.has(id) ? ALL_TF : tf }));
}

// Trend and horizontal lines come in segment → ray → extended-line variants; "extend" picks the variant.
const FAMILIES = [
  ["segment", "rayLine", "straightLine"],
  ["horizontalSegment", "horizontalRayLine", "horizontalStraightLine"],
];
export const EXTEND_LABELS = ["None", "Right", "Both"] as const;

export function extendOf(name: string): { level: number; family: string[] } | null {
  const family = FAMILIES.find((f) => f.includes(name));
  return family ? { level: family.indexOf(name), family } : null;
}

/** Ids change when a snapshot is re-created, so history and storage hold drawings without them. */
export function stripId({ id, ...d }: Drawing & { id: string }): Drawing {
  void id;
  return d;
}
