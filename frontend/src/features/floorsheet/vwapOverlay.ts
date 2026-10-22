import type { BrokerAnalytics } from "./types";

export type VwapLine = { broker: number; side: "buy" | "sell"; points: { time: string; value: number }[] };

const day = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Data for the BrokerVwapOverlay: one flat line per top net buyer at its buy VWAP and per top net seller at
 * its sell VWAP, spanning the analytics window. Points use "YYYY-MM-DD" business-day time.
 */
export function brokerVwapOverlay(a: BrokerAnalytics, top = 3, until = new Date()): VwapLine[] {
  if (!a.from_day) return [];
  // from_day is NPT midnight in UTC (e.g. 18:15Z the day before); +5:45 gives the NPT calendar date.
  const from = day(new Date(new Date(a.from_day).getTime() + 345 * 60_000));
  const span = (v: number) => [
    { time: from, value: v },
    { time: day(until), value: v },
  ];
  const buys = a.rows // rows arrive sorted by net, descending
    .filter((r) => r.net > 0 && r.buy_vwap !== null)
    .slice(0, top)
    .map((r): VwapLine => ({ broker: r.broker, side: "buy", points: span(r.buy_vwap!) }));
  const sells = a.rows
    .filter((r) => r.net < 0 && r.sell_vwap !== null)
    .slice(-top)
    .reverse()
    .map((r): VwapLine => ({ broker: r.broker, side: "sell", points: span(r.sell_vwap!) }));
  return [...buys, ...sells];
}
