import { describe, expect, it } from "vitest";
import { stepIndex, visibleCandles } from "./replay";
import type { Candle } from "./types";

const bars = [1, 2, 3, 4].map((time) => ({ time, open: 1, high: 1, low: 1, close: 1, volume: 0 }) as Candle);

describe("replay", () => {
  it("truncates to the replay bar and restores everything on exit", () => {
    expect(visibleCandles(bars, 1).map((b) => b.time)).toEqual([1, 2]);
    expect(visibleCandles(bars, null)).toBe(bars);
  });

  it("steps within bounds", () => {
    expect(stepIndex(2, 4)).toBe(3);
    expect(stepIndex(3, 4)).toBe(3);
    expect(stepIndex(0, 4, -1)).toBe(0);
  });
});
