import { describe, expect, it } from "vitest";
import { bollinger, ema, macd } from "./indicators";

describe("indicators", () => {
  it("ema seeds with sma then smooths", () => {
    const e = ema([1, 2, 3, 4, 5], 3);
    expect(e.slice(0, 2)).toEqual([null, null]);
    expect(e[2]).toBe(2);
    expect(e[3]).toBe(3); // 4*0.5 + 2*0.5
  });
  it("macd histogram = line - signal, null until warmed up", () => {
    const v = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 3) * 5);
    const m = macd(v);
    expect(m.line[24]).toBeNull();
    expect(m.line[25]).not.toBeNull();
    expect(m.signal[32]).toBeNull();
    expect(m.hist[59]).toBeCloseTo(m.line[59]! - m.signal[59]!);
  });
  it("bollinger bands are symmetric around the mean", () => {
    const b = bollinger([1, 2, 3, 4, 5], 5, 2);
    expect(b.mid[4]).toBe(3);
    expect(b.upper[4]! - 3).toBeCloseTo(3 - b.lower[4]!);
  });
});
