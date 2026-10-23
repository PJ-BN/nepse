import type { Chart, OverlayFigure } from "klinecharts";
import type { XY } from "./geometry";

export const GREEN = "rgba(38,166,154,0.18)";
export const RED = "rgba(239,83,80,0.18)";
export const BLUE = "rgba(41,98,255,0.15)";

export const lines = (segments: XY[][], dashed = false): OverlayFigure => ({
  type: "line",
  attrs: segments.map((coordinates) => ({ coordinates })),
  styles: dashed ? { style: "dashed" } : undefined,
});

export const texts = (items: { x: number; y: number; text: string; baseline?: string; align?: string }[]): OverlayFigure => ({
  type: "text",
  ignoreEvent: true,
  attrs: items.map((t) => ({ baseline: "bottom", ...t })),
});

export const fill = (coordinates: XY[], color: string): OverlayFigure => ({
  type: "polygon",
  attrs: { coordinates },
  styles: { style: "fill", color },
  ignoreEvent: true,
});

export const price = (chart: Chart, v: number) => v.toFixed(chart.getSymbol()?.pricePrecision ?? 2);

/** UTC date, matching the chart's timezone. */
export const day = (ts?: number) => (ts ? new Date(ts).toISOString().slice(0, 10) : "");
