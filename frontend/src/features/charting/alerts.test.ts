import { describe, expect, it } from "vitest";
import { makeAlert, triggered } from "./alerts";

describe("alerts", () => {
  it("picks the side from the reference price", () => {
    expect(makeAlert("API", 110, 100).dir).toBe("above");
    expect(makeAlert("API", 90, 100).dir).toBe("below");
  });

  it("fires only alerts whose level the live price has reached", () => {
    const up = makeAlert("API", 110, 100);
    const down = makeAlert("API", 90, 100);
    const other = makeAlert("NABIL", 10, 5);
    const ltp = (s: string) => (s === "API" ? 111 : undefined);
    const { fired, rest } = triggered([up, down, other], ltp);
    expect(fired).toEqual([up]);
    expect(rest).toEqual([down, other]);
  });
});
