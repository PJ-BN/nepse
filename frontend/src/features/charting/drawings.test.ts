import { describe, expect, it } from "vitest";
import { ALL_TF, extendOf, mergeDrawings, parseStored, type Drawing } from "./drawings";

const d = (name: string, tf?: string): Drawing => ({ name, points: [{ value: 1 }], tf });

describe("drawings storage", () => {
  it("migrates legacy data to all timeframes without dropping it", () => {
    const legacy = JSON.stringify([{ name: "segment", points: [{ value: 1 }] }, { name: "rect", points: [] }]);
    const out = parseStored(null, legacy);
    expect(out.map((x) => x.name)).toEqual(["segment", "rect"]);
    expect(out.every((x) => x.tf === ALL_TF)).toBe(true);
  });
  it("prefers v2 once it exists and survives corrupt data", () => {
    expect(parseStored(JSON.stringify([d("a", "1D")]), JSON.stringify([d("old")])).map((x) => x.name)).toEqual(["a"]);
    expect(parseStored("{oops", null)).toEqual([]);
    expect(parseStored("{oops", JSON.stringify([d("old")]))[0].tf).toBe(ALL_TF);
  });
  it("merge replaces this timeframe and all-timeframe drawings, keeps others", () => {
    const stored = [d("w", "1W"), d("day", "1D"), d("all", ALL_TF)];
    expect(mergeDrawings(stored, "1D", [d("new", "1D")]).map((x) => x.name)).toEqual(["w", "new"]);
  });
  it("extend maps within a line family", () => {
    expect(extendOf("rayLine")?.level).toBe(1);
    expect(extendOf("horizontalSegment")?.family[2]).toBe("horizontalStraightLine");
    expect(extendOf("rect")).toBeNull();
  });
});
