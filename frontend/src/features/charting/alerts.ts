export type Alert = { id: string; symbol: string; price: number; dir: "above" | "below" };

const KEY = "nepse:alerts";

export function loadAlerts(): Alert[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveAlerts(alerts: Alert[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(alerts));
  } catch {
    // storage unavailable: alerts just won't persist
  }
}

/** The side is fixed when the alert is set, so it fires once the price reaches the level from where it started. */
export const makeAlert = (symbol: string, price: number, ref: number): Alert => ({
  id: `${symbol}-${price}-${Date.now()}`,
  symbol,
  price,
  dir: price >= ref ? "above" : "below",
});

/** Splits alerts into those the live prices have reached (one-shot) and those still waiting. */
export function triggered(alerts: Alert[], ltp: (symbol: string) => number | undefined) {
  const fired: Alert[] = [];
  const rest: Alert[] = [];
  for (const a of alerts) {
    const p = ltp(a.symbol);
    (p !== undefined && (a.dir === "above" ? p >= a.price : p <= a.price) ? fired : rest).push(a);
  }
  return { fired, rest };
}
