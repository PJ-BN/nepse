"use client";

import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import { bollinger, ema, macd, rsi, sma } from "../indicators";
import { DEFAULT_INDICATORS, type Candle, type Indicator, type PriceOverlay } from "../types";

const UP = "#16a34a";
const DOWN = "#dc2626";

type Series = { candles: ISeriesApi<"Candlestick">; volume: ISeriesApi<"Histogram"> };

function line(times: UTCTimestamp[], values: (number | null)[]) {
  return values.flatMap((value, i) => (value === null ? [] : [{ time: times[i], value }]));
}

/**
 * Candles (daily or intraday) with volume and user-chosen indicators (lightweight-charts v5).
 * Fills its parent, so the parent decides the size (and can be drag-resized).
 */
export function NepseTradingChart({
  candles,
  overlay = [],
  intraday = false,
  indicators = DEFAULT_INDICATORS,
}: {
  candles: Candle[];
  overlay?: PriceOverlay[];
  intraday?: boolean;
  indicators?: Indicator[];
}) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<Series | null>(null);

  useEffect(() => {
    const c = createChart(el.current!, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#888" },
      grid: { vertLines: { color: "rgba(128,128,128,0.1)" }, horzLines: { color: "rgba(128,128,128,0.1)" } },
      timeScale: { borderVisible: false },
    });
    const s: Series = {
      candles: c.addSeries(CandlestickSeries, { upColor: UP, downColor: DOWN, wickUpColor: UP, wickDownColor: DOWN, borderVisible: false }),
      volume: c.addSeries(HistogramSeries, { priceScaleId: "vol", priceFormat: { type: "volume" }, lastValueVisible: false }),
    };
    c.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    chart.current = c;
    series.current = s;
    return () => {
      c.remove();
      chart.current = null;
      series.current = null;
    };
  }, []);

  useEffect(() => {
    const s = series.current;
    if (!s) return;
    const times = candles.map((c) => c.time as UTCTimestamp);
    s.candles.setData(candles.map((c, i) => ({ time: times[i], open: c.open, high: c.high, low: c.low, close: c.close })));
    s.volume.setData(
      candles.map((c, i) => ({ time: times[i], value: c.volume, color: c.close >= c.open ? `${UP}66` : `${DOWN}66` })),
    );
    chart.current?.timeScale().fitContent();
  }, [candles]);

  // Indicators are rebuilt whenever the list or the data changes; oscillators each get their own pane below the price.
  useEffect(() => {
    const c = chart.current;
    if (!c) return;
    const times = candles.map((x) => x.time as UTCTimestamp);
    const closes = candles.map((x) => x.close);
    const added: ISeriesApi<"Line" | "Histogram">[] = [];
    const lineOpts = (color: string) => ({ color, lineWidth: 1 as const, priceLineVisible: false, lastValueVisible: false });
    const addLine = (color: string, values: (number | null)[], pane = 0) => {
      const l = c.addSeries(LineSeries, lineOpts(color), pane);
      l.setData(line(times, values));
      added.push(l);
      return l;
    };
    let pane = 0;
    for (const ind of indicators) {
      if (ind.type === "sma") addLine(ind.color, sma(closes, ind.period));
      else if (ind.type === "ema") addLine(ind.color, ema(closes, ind.period));
      else if (ind.type === "bb") {
        const b = bollinger(closes, ind.period);
        [b.upper, b.mid, b.lower].forEach((v) => addLine(ind.color, v));
      } else if (ind.type === "rsi") {
        const l = addLine(ind.color, rsi(closes, ind.period), ++pane);
        for (const price of [70, 30]) l.createPriceLine({ price, color: "#888", lineStyle: 2, lineWidth: 1, axisLabelVisible: false, title: "" });
      } else {
        const m = macd(closes);
        ++pane;
        const h = c.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false }, pane);
        h.setData(m.hist.flatMap((v, i) => (v === null ? [] : [{ time: times[i], value: v, color: v >= 0 ? `${UP}99` : `${DOWN}99` }])));
        added.push(h);
        addLine(ind.color, m.line, pane);
        addLine("#f59e0b", m.signal, pane);
      }
    }
    c.panes().slice(1).forEach((p) => p.setHeight(120));
    return () => {
      // Removing a pane's last series drops the pane, so the next run starts from a clean layout.
      try {
        added.forEach((s) => c.removeSeries(s));
      } catch {
        // chart already disposed by the mount effect cleanup
      }
    };
  }, [candles, indicators]);

  useEffect(() => {
    chart.current?.applyOptions({ timeScale: { timeVisible: intraday } });
  }, [intraday]);

  useEffect(() => {
    const s = series.current;
    if (!s) return;
    const lines: IPriceLine[] = overlay.map((o) =>
      s.candles.createPriceLine({ price: o.price, color: o.color, lineStyle: 2, lineWidth: 1, axisLabelVisible: true, title: o.title }),
    );
    return () => {
      try {
        lines.forEach((l) => s.candles.removePriceLine(l));
      } catch {
        // chart already disposed by the mount effect cleanup
      }
    };
  }, [overlay]);

  return <div ref={el} className="h-full w-full" />;
}
