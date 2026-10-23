import { describe, expect, it } from "vitest";
import { normalise } from "./compare";
import type { Candle } from "./types";

const c = (time: number, close: number): Candle => ({ time, open: close, high: close, low: close, close, volume: 0 });

describe("normalise", () => {
  it("starts at the main close on the first shared bar and keeps relative moves", () => {
    const main = [c(1, 100), c(2, 110), c(3, 120)];
    const other = [c(2, 10), c(3, 15)]; // no bar at t=1
    const { values, pct } = normalise(main, other);
    expect(values).toEqual({ 2000: 110, 3000: 165 });
    expect(pct).toBeCloseTo(50);
  });

  it("can re-base at a later bar", () => {
    const main = [c(1, 100), c(2, 110), c(3, 120)];
    const other = [c(1, 10), c(2, 10), c(3, 20)];
    const { values, pct } = normalise(main, other, 2);
    expect(values[2000]).toBe(110);
    expect(values[3000]).toBe(220);
    expect(pct).toBeCloseTo(100);
  });

  it("is empty when nothing overlaps", () => {
    expect(normalise([c(1, 1)], [c(2, 1)])).toEqual({ values: {}, pct: null });
  });
});
