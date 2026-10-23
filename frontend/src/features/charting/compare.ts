import type { Kline } from "./klines/types";
import type { Candle } from "./types";

export const COMPARE = "COMPARE";
export const COMPARE_COLOR = "#06b6d4";

/**
 * Re-bases `other` so it starts at the main series' close on the first bar at or after `from` (unix s) that both share:
 * the overlay then reads as relative performance on the main price axis. Keyed by bar timestamp (ms); `pct` is
 * other's change since that bar.
 */
export function normalise(main: Candle[], other: Candle[], from = 0): { values: Record<number, number>; pct: number | null } {
  const at = new Map(other.map((c) => [c.time, c.close]));
  const first = main.find((c) => c.time >= from && at.get(c.time));
  if (!first) return { values: {}, pct: null };
  const k = first.close / at.get(first.time)!;
  const values: Record<number, number> = {};
  let last = 0;
  for (const c of main) {
    const v = at.get(c.time);
    if (!v) continue;
    values[c.time * 1000] = v * k;
    last = v;
  }
  return { values, pct: (last / at.get(first.time)! - 1) * 100 };
}

let done = false;
/** klinecharts can't be imported during SSR, so the indicator is registered with the module passed in. */
export function registerCompare(k: Kline) {
  if (done) return;
  done = true;
  k.registerIndicator<{ v?: number }, number, Record<number, number>>({
    name: COMPARE,
    shortName: "Compare",
    series: "price",
    figures: [{ key: "v", title: "Cmp: ", type: "line" }],
    calc: (list, ind) => list.map((d) => ({ v: ind.extendData?.[d.timestamp] })),
  });
}
