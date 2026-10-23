import type { Candle } from "./types";

export const SPEEDS = [1, 2, 5, 10] as const; // bars per second

/** Candles shown while replaying: everything up to and including bar `idx`; `null` means no replay. */
export const visibleCandles = (full: Candle[], idx: number | null) => (idx === null ? full : full.slice(0, idx + 1));

/** Index after one step, clamped to the last bar. */
export const stepIndex = (idx: number, total: number, by = 1) => Math.max(0, Math.min(idx + by, total - 1));
