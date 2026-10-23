import { describe, expect, it } from "vitest";
import { newIndicator, newRow, parseHorizons, rowsToRules } from "./rules";

describe("rowsToRules", () => {
  it("maps rows to the request JSON, numbers and indicators on the right", () => {
    const rows = [
      newRow(),
      newRow({ left: newIndicator("close"), op: "crosses_above", right: { ...newIndicator("sma"), params: { n: "200" } } }),
    ];
    expect(rowsToRules(rows, "and")).toEqual({
      and: [
        { left: { ind: "rsi", n: 14 }, op: "<", right: 30 },
        { left: { ind: "close" }, op: "crosses_above", right: { ind: "sma", n: 200 } },
      ],
    });
  });

  it("carries every parameter of multi-parameter indicators and honours or", () => {
    const rules = rowsToRules([newRow({ left: newIndicator("macd.hist"), op: ">", right: { kind: "num", value: "0" } })], "or");
    expect(rules).toEqual({ or: [{ left: { ind: "macd.hist", fast: 12, slow: 26, signal: 9 }, op: ">", right: 0 }] });
  });

  it("drops incomplete rows and returns null when none is left", () => {
    const blank = newRow({ right: { kind: "num", value: "" } });
    const badParam = newRow({ left: { ...newIndicator("rsi"), params: { n: "x" } } });
    expect(rowsToRules([blank, badParam], "and")).toBeNull();
    expect(rowsToRules([blank, newRow()], "and")).toEqual({ and: [{ left: { ind: "rsi", n: 14 }, op: "<", right: 30 }] });
  });
});

describe("parseHorizons", () => {
  it("sorts and de-duplicates", () => expect(parseHorizons("20, 5,5, 10")).toEqual([5, 10, 20]));
  it("rejects bad input", () => {
    expect(parseHorizons("")).toBeNull();
    expect(parseHorizons("5, x")).toBeNull();
    expect(parseHorizons("0")).toBeNull();
    expect(parseHorizons("2.5")).toBeNull();
  });
});
