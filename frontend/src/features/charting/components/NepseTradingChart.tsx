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
import { rsi, sma } from "../indicators";
import type { Candle, PriceOverlay } from "../types";

const UP = "#16a34a";
const DOWN = "#dc2626";

type Series = {
  candles: ISeriesApi<"Candlestick">;
  volume: ISeriesApi<"Histogram">;
  sma20: ISeriesApi<"Line">;
  sma50: ISeriesApi<"Line">;
  rsi: ISeriesApi<"Line">;
};

function line(times: UTCTimestamp[], values: (number | null)[]) {
  return values.flatMap((value, i) => (value === null ? [] : [{ time: times[i], value }]));
}

/** Candles (daily or intraday) with volume, SMA 20/50 overlays and an RSI 14 pane (lightweight-charts v5). */
export function NepseTradingChart({
  candles,
  overlay = [],
  intraday = false,
  height = 560,
}: {
  candles: Candle[];
  overlay?: PriceOverlay[];
  intraday?: boolean;
  height?: number;
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
      sma20: c.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 1, priceLineVisible: false, lastValueVisible: false }),
      sma50: c.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 1, priceLineVisible: false, lastValueVisible: false }),
      rsi: c.addSeries(LineSeries, { color: "#a855f7", lineWidth: 1, priceLineVisible: false }, 1),
    };
    c.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    s.rsi.createPriceLine({ price: 70, color: "#888", lineStyle: 2, lineWidth: 1, axisLabelVisible: false, title: "" });
    s.rsi.createPriceLine({ price: 30, color: "#888", lineStyle: 2, lineWidth: 1, axisLabelVisible: false, title: "" });
    c.panes()[1]?.setHeight(120);
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
    const closes = candles.map((c) => c.close);
    s.candles.setData(candles.map((c, i) => ({ time: times[i], open: c.open, high: c.high, low: c.low, close: c.close })));
    s.volume.setData(
      candles.map((c, i) => ({ time: times[i], value: c.volume, color: c.close >= c.open ? `${UP}66` : `${DOWN}66` })),
    );
    s.sma20.setData(line(times, sma(closes, 20)));
    s.sma50.setData(line(times, sma(closes, 50)));
    s.rsi.setData(line(times, rsi(closes, 14)));
    chart.current?.timeScale().fitContent();
  }, [candles]);

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

  return <div ref={el} style={{ height }} className="w-full" />;
}
