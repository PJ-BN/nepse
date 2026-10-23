import { describe, expect, it } from "vitest";
import { arrowHead, atX, fibExtension, gannRays, harmonicRatios, measure, offsetFromLine, pitchfork, position } from "./geometry";

describe("drawing geometry", () => {
  it("fib extension projects A→B swing from C", () => {
    const l = fibExtension(100, 110, 105, [0, 1, 1.618]);
    expect(l.map((x) => x.value)).toEqual([105, 115, 105 + 10 * 1.618]);
  });
  it("atX / offsetFromLine", () => {
    expect(atX({ x: 0, y: 0 }, { x: 10, y: 20 }, 5)).toEqual({ x: 5, y: 10 });
    expect(offsetFromLine({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 5, y: 8 })).toBe(3);
  });
  it("gann 1x1 passes through the second point", () => {
    const r = gannRays({ x: 0, y: 0 }, { x: 10, y: 10 });
    expect(r.find((g) => g.label === "1x1")!.to).toEqual({ x: 10, y: 10 });
    expect(r.find((g) => g.label === "2x1")!.to.y).toBe(20);
  });
  it("pitchfork prongs are parallel to the median", () => {
    const f = pitchfork({ x: 0, y: 0 }, { x: 10, y: -10 }, { x: 10, y: 10 });
    expect(f.median[1]).toEqual({ x: 10, y: 0 });
    expect(f.upper[1]).toEqual({ x: 20, y: -10 });
    expect(f.lower[1]).toEqual({ x: 20, y: 10 });
  });
  it("arrow head ends at the tip", () => {
    expect(arrowHead({ x: 0, y: 0 }, { x: 10, y: 0 })[1]).toEqual({ x: 10, y: 0 });
  });
  it("measure gives % change and bar count", () => {
    expect(measure({ value: 100, bars: 3 }, { value: 110, bars: 8 })).toEqual({ price: 10, pct: 10, bars: 5 });
  });
  it("position risk-reward, long and short", () => {
    const l = position(100, 95, 110);
    expect(l).toMatchObject({ long: true, valid: true, risk: 5, reward: 10, rr: 2, riskPct: 5, rewardPct: 10 });
    expect(position(100, 105, 90)).toMatchObject({ long: false, valid: true, rr: 2 });
    expect(position(100, 105, 110).valid).toBe(false);
  });
  it("harmonic ratios", () => {
    const r = harmonicRatios([0, 100, 61.8, 88.6, 78.6]);
    expect(r.ab).toBeCloseTo(0.382, 3);
    expect(r.ad).toBeCloseTo(0.214, 3);
  });
});
