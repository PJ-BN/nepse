import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, normalize } from "./settings";

describe("settings", () => {
  it("fills missing fields from defaults so old saves still load", () => {
    expect(normalize({ type: "ohlc" })).toEqual({ ...DEFAULT_SETTINGS, type: "ohlc" });
    expect(normalize(null)).toEqual(DEFAULT_SETTINGS);
  });
});
