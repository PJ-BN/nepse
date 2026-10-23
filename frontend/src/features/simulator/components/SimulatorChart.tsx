"use client";

import {
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import { useEffect, useMemo, useRef } from "react";
import type { SimulationResult } from "../types";

const UP = "#16a34a";
const DOWN = "#dc2626";
const COLORS = ["#f59e0b", "#3b82f6", "#a855f7", "#14b8a6", "#ec4899", "#84cc16"];

type Built = { candles: ISeriesApi<"Candlestick">; lines: ISeriesApi<"Line">[]; markers: ReturnType<typeof createSeriesMarkers<Time>> };

/** Oscillators that share a prefix (macd(12,26,9).line / .hist) share a pane; others get their own. */
const paneGroup = (name: string) => name.split(/[.(]/)[0];

/** Shows bars up to the anchor plus `revealed` bars of the future. */
export function SimulatorChart({ result, revealed }: { result: SimulationResult; revealed: number }) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const built = useRef<Built | null>(null);

  const anchorIdx = useMemo(() => result.bars.findIndex((b) => b.t === result.anchor.date), [result]);
  const panes = useMemo(() => [...new Set(result.indicators.filter((i) => i.pane === "oscillator").map((i) => paneGroup(i.name)))], [result]);

  useEffect(() => {
    const c = createChart(el.current!, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#888" },
      grid: { vertLines: { color: "rgba(128,128,128,0.1)" }, horzLines: { color: "rgba(128,128,128,0.1)" } },
      timeScale: { borderVisible: false },
    });
    const candles = c.addSeries(CandlestickSeries, { upColor: UP, downColor: DOWN, wickUpColor: UP, wickDownColor: DOWN, borderVisible: false });
    const lines = result.indicators.map((ind, i) =>
      c.addSeries(
        LineSeries,
        { color: COLORS[i % COLORS.length], lineWidth: 1, priceLineVisible: false, lastValueVisible: false, title: ind.name },
        ind.pane === "price" ? 0 : 1 + panes.indexOf(paneGroup(ind.name)),
      ),
    );
    panes.forEach((_, i) => c.panes()[1 + i]?.setHeight(110));
    chart.current = c;
    built.current = { candles, lines, markers: createSeriesMarkers(candles, []) };
    return () => {
      c.remove();
      chart.current = built.current = null;
    };
  }, [result, panes]);

  useEffect(() => {
    const b = built.current;
    if (!b) return;
    const end = Math.min(result.bars.length, anchorIdx + 1 + revealed);
    const bars = result.bars.slice(0, end);
    b.candles.setData(bars.flatMap((x) => (x.o == null || x.h == null || x.l == null || x.c == null ? [] : [{ time: x.t as Time, open: x.o, high: x.h, low: x.l, close: x.c }])));
    result.indicators.forEach((ind, i) =>
      b.lines[i].setData(bars.flatMap((x, j) => (ind.values[j] == null ? [] : [{ time: x.t as Time, value: ind.values[j] as number }]))),
    );
    const marks: SeriesMarker<Time>[] = result.events.map((e) => ({
      time: e.date as Time,
      position: "belowBar",
      shape: "arrowUp",
      color: "#3b82f6",
      size: 1,
    }));
    marks.push({
      time: result.anchor.date as Time,
      position: "aboveBar",
      shape: "circle",
      color: result.anchor.fired ? "#f59e0b" : "#888",
      text: result.anchor.fired ? "anchor (fired)" : "anchor",
      size: 2,
    });
    const seen = new Set(bars.map((x) => x.t));
    b.markers.setMarkers(marks.filter((m) => seen.has(m.time as string)).sort((x, y) => (x.time as string).localeCompare(y.time as string)));
    chart.current?.timeScale().fitContent();
  }, [result, anchorIdx, revealed]);

  return <div ref={el} className="h-[520px] w-full" />;
}
