import { describe, expect, it } from "vitest";
import { actionLabel, barOnOrAfter, profileWidth } from "./geometry";

describe("nepse layer geometry", () => {
  it("labels bonus, cash and right of one closure", () => {
    expect(actionLabel({ date: "2025-01-05", fy: "81/82", bonus_pct: 10, cash_pct: 5.5, right_ratio: "1:0.5" })).toBe("B10% C5.5% R1:0.5");
    expect(actionLabel({ date: "2025-01-05", fy: "81/82", bonus_pct: 0, cash_pct: 5, right_ratio: null })).toBe("C5%");
  });
  it("finds the ex-date bar, skipping holidays and not matching beyond the last bar", () => {
    const dates = ["2025-01-01", "2025-01-02", "2025-01-05"];
    expect(barOnOrAfter(dates, "2025-01-02")).toBe(1);
    expect(barOnOrAfter(dates, "2025-01-03")).toBe(2);
    expect(barOnOrAfter(dates, "2025-02-01")).toBe(-1);
  });
  it("scales profile bars to the busiest bin", () => {
    expect(profileWidth(50, 100, 200)).toBe(100);
    expect(profileWidth(0, 0, 200)).toBe(0);
  });
});
