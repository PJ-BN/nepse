import { describe, expect, it } from "vitest";
import fixture from "./fixtures/simulation_response.json";
import { parseHorizons, rowsToRules, newRow, newIndicator } from "./rules";
import type { SimulationRequest, SimulationResult } from "./types";

// fixtures/simulation_response.json is a copy of backend/tests/presentation/fixtures/simulation_response.json:
// refresh it when the backend contract changes so drift fails here.
const res: SimulationResult = fixture.response as unknown as SimulationResult;
const req: SimulationRequest = fixture.request as unknown as SimulationRequest;

describe("backend contract", () => {
  it("fixture has the shapes the UI reads", () => {
    expect(res.indicators.every((i) => i.values.length === res.bars.length)).toBe(true);
    expect(res.bars.some((b) => b.t === res.anchor.date)).toBe(true);
    expect(res.forward?.results.map((r) => r.horizon)).toEqual(req.horizons);
    expect(res.stats.horizons.map((h) => h.horizon)).toEqual(req.horizons);
    expect(res.events.length).toBe(res.stats.events);
  });

  it("builds the request rules JSON exactly as the backend example", () => {
    const rows = [
      newRow({ left: newIndicator("close"), op: "crosses_above", right: { ...newIndicator("sma"), params: { n: "5" } } }),
      newRow({ left: { ...newIndicator("rsi"), params: { n: "5" } }, op: "<", right: { kind: "num", value: "35" } }),
    ];
    expect(rowsToRules(rows, "or")).toEqual(req.rules);
    expect(parseHorizons("3, 5")).toEqual(req.horizons);
  });
});
