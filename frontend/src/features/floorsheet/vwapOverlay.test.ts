import { describe, expect, it } from "vitest";
import { brokerVwapOverlay } from "./vwapOverlay";
import type { BrokerAnalytics, CostBasisRow } from "./types";

const row = (broker: number, net: number, buy_vwap: number | null, sell_vwap: number | null): CostBasisRow => ({
  broker, buy_qty: Math.max(net, 0), sell_qty: Math.max(-net, 0), net, buy_vwap, sell_vwap,
  bar: 0, margin_pct: null, unrealised_pl: null,
});

const analytics = (rows: CostBasisRow[], from_day: string | null = "2025-01-01T18:15:00Z"): BrokerAnalytics => ({
  symbol: "NABIL", days: 5, from_day, ltp: 500, total_volume: 1000, cornering_index: 0,
  float_market_cap: null, cornering_alert: false, rows, sankey: [],
});

const until = new Date("2025-01-10T00:00:00Z");

describe("brokerVwapOverlay", () => {
  it("is empty without a window start", () => {
    expect(brokerVwapOverlay(analytics([row(1, 10, 500, null)], null), 3, until)).toEqual([]);
  });

  it("draws top net buyers at buy VWAP and top net sellers at sell VWAP", () => {
    // rows arrive sorted by net, descending
    const rows = [row(1, 50, 500, null), row(2, 20, 490, null), row(3, 0, null, null), row(4, -10, null, 510), row(5, -40, null, 520)];
    const lines = brokerVwapOverlay(analytics(rows), 1, until);
    expect(lines.map((l) => [l.broker, l.side])).toEqual([[1, "buy"], [5, "sell"]]);
    expect(lines[0].points.map((p) => p.value)).toEqual([500, 500]);
    expect(lines[1].points.map((p) => p.value)).toEqual([520, 520]);
  });

  it("orders sellers most-negative first and respects top", () => {
    const rows = [row(4, -10, null, 510), row(5, -20, null, 520), row(6, -30, null, 530)];
    expect(brokerVwapOverlay(analytics(rows), 2, until).map((l) => l.broker)).toEqual([6, 5]);
  });

  it("converts the UTC window start to the NPT calendar date", () => {
    const [line] = brokerVwapOverlay(analytics([row(1, 5, 100, null)]), 3, until); // 18:15Z Jan 1 = Jan 2 00:00 NPT
    expect(line.points.map((p) => p.time)).toEqual(["2025-01-02", "2025-01-10"]);
  });

  it("skips brokers whose VWAP is unknown", () => {
    expect(brokerVwapOverlay(analytics([row(1, 5, null, null)]), 3, until)).toEqual([]);
  });
});
