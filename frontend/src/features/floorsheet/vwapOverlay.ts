import type { BrokerAnalytics } from "./types";

export type VwapLine = { broker: number; points: { time: string; value: number }[] };

const day = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Data for the BrokerVwapOverlay: one flat line per top net buyer at its buy VWAP, spanning the analytics
 * window. Points use lightweight-charts' "YYYY-MM-DD" business-day time. feat/charting draws it.
 */
export function brokerVwapOverlay(a: BrokerAnalytics, top = 3, until = new Date()): VwapLine[] {
  if (!a.from_day) return [];
  // from_day is NPT midnight in UTC (e.g. 18:15Z the day before); +5:45 gives the NPT calendar date.
  const from = day(new Date(new Date(a.from_day).getTime() + 345 * 60_000));
  return a.rows
    .filter((r) => r.net > 0 && r.buy_vwap !== null)
    .slice(0, top) // rows arrive sorted by net, descending
    .map((r) => ({
      broker: r.broker,
      points: [
        { time: from, value: r.buy_vwap! },
        { time: day(until), value: r.buy_vwap! },
      ],
    }));
}
