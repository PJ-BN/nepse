import type { KLineData } from "klinecharts";
import { describe, expect, it } from "vitest";
import { evaluateFormula, validateFormula } from "./formula";

describe("formula evaluator", () => {
  const bars: KLineData[] = Array.from({ length: 30 }, (_, i) => ({
    timestamp: 1000 + i * 1000,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 102 + i,
    volume: 1000,
  }));

  it("evaluates simple arithmetic and variables", () => {
    const res = evaluateFormula("close + 10", bars);
    expect(res[0]).toBe(112);
    expect(res[29]).toBe(102 + 29 + 10);
  });

  it("evaluates typical price (high + low + close) / 3", () => {
    const res = evaluateFormula("(high + low + close) / 3", bars);
    expect(res[0]).toBeCloseTo((105 + 95 + 102) / 3);
  });

  it("evaluates built-in indicator functions like sma and ema", () => {
    const res = evaluateFormula("close - sma(close, 10)", bars);
    expect(res[8]).toBeNull();
    expect(res[9]).not.toBeNull();
  });

  it("supports shorthand fn(period)", () => {
    const res = evaluateFormula("sma(10)", bars);
    expect(res[9]).not.toBeNull();
  });

  it("evaluates formula spread like ema(9) - ema(21)", () => {
    const res = evaluateFormula("ema(close, 9) - ema(close, 21)", bars);
    expect(res[19]).toBeNull();
    expect(res[20]).not.toBeNull();
  });

  it("evaluates z-score (close - sma(20)) / std(20)", () => {
    const res = evaluateFormula("(close - sma(20)) / std(20)", bars);
    expect(res[18]).toBeNull();
    expect(res[19]).not.toBeNull();
  });

  it("validates good and bad formulas correctly", () => {
    expect(validateFormula("close * 1.05").valid).toBe(true);
    expect(validateFormula("(high - low) / close * 100").valid).toBe(true);
    expect(validateFormula("bad_func(close)").valid).toBe(false);
    expect(validateFormula("close + (").valid).toBe(false);
    expect(validateFormula("unknown_var").valid).toBe(false);
  });
});
