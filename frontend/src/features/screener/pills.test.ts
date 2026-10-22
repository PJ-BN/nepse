import { describe, expect, it } from "vitest";
import { filterToPills, newPill, pillToCondition, pillsToFilter } from "./pills";

describe("pillToCondition", () => {
  it("parses numeric and string literals by field kind", () => {
    expect(pillToCondition(newPill({ field: "pbv", op: "<", value: " 1.5 " }))).toEqual({ field: "pbv", op: "<", value: 1.5 });
    expect(pillToCondition(newPill({ field: "sector", op: "=", value: "BANKING" }))).toEqual({ field: "sector", op: "=", value: "BANKING" });
  });

  it("returns null for blank or non-numeric input", () => {
    expect(pillToCondition(newPill({ field: "pbv", value: "" }))).toBeNull();
    expect(pillToCondition(newPill({ field: "pbv", value: "abc" }))).toBeNull();
  });

  it("builds between, in and column-comparison conditions", () => {
    expect(pillToCondition(newPill({ field: "rsi_14", op: "between", value: "30", value2: "40" })))
      .toEqual({ field: "rsi_14", op: "between", value: [30, 40] });
    expect(pillToCondition(newPill({ field: "rsi_14", op: "between", value: "30" }))).toBeNull();
    expect(pillToCondition(newPill({ field: "sector", op: "in", value: "BANKING, HYDRO" })))
      .toEqual({ field: "sector", op: "in", value: ["BANKING", "HYDRO"] });
    expect(pillToCondition(newPill({ field: "sector", op: "in", value: "BANKING," }))).toBeNull();
    expect(pillToCondition(newPill({ field: "close", op: "<", compareTo: "graham_number" })))
      .toEqual({ field: "close", op: "<", value: { field: "graham_number" } });
  });
});

describe("pillsToFilter", () => {
  it("drops incomplete pills and combines the rest", () => {
    const pills = [newPill({ field: "pbv", op: "<", value: "2" }), newPill({ field: "pe", value: "" })];
    expect(pillsToFilter(pills, "and")).toEqual({ and: [{ field: "pbv", op: "<", value: 2 }] });
    expect(pillsToFilter(pills, "or")).toEqual({ or: [{ field: "pbv", op: "<", value: 2 }] });
  });

  it("is null when nothing is complete", () => {
    expect(pillsToFilter([newPill()], "and")).toBeNull();
    expect(pillsToFilter([], "and")).toBeNull();
  });
});

describe("filterToPills", () => {
  it("round-trips a flat preset", () => {
    const node = { and: [
      { field: "sector", op: "=", value: "BANKING" },
      { field: "close", op: "<", value: { field: "graham_number" } },
      { field: "rsi_14", op: "between", value: [30, 40] },
    ] } as const;
    const out = filterToPills(node as never)!;
    expect(out.combinator).toBe("and");
    expect(pillsToFilter(out.pills, out.combinator)).toEqual(node);
  });

  it("rejects nested trees and unknown fields", () => {
    expect(filterToPills({ and: [{ or: [] }] } as never)).toBeNull();
    expect(filterToPills({ field: "bogus", op: "=", value: 1 } as never)).toBeNull();
  });
});
