import type { IndicatorDef } from "../indicators";
import type { Kline } from "../types";
import { actionLabel, barOnOrAfter, dateOf, profileWidth } from "./geometry";
import { getLayerData } from "./store";

const calc = (data: unknown[]) => data.map(() => ({})); // drawn entirely by `draw`; nothing to calculate

/** Registers a main-pane indicator that paints itself on the canvas from the per-chart layer data. */
function layer(name: string, draw: Parameters<Kline["registerIndicator"]>[0]["draw"]) {
  return (k: Kline) => k.registerIndicator({ name, shortName: "", series: "normal", calc, draw });
}

export const CIRCUIT: IndicatorDef = {
  name: "NEPSE_CIRCUIT",
  label: "Circuit limits ±10%",
  main: true,
  register: layer("NEPSE_CIRCUIT", ({ ctx, chart, xAxis, yAxis }) => {
    const byDate = new Map(getLayerData(chart).circuit.map((c) => [c.date, c]));
    const { from, to } = chart.getVisibleRange();
    const bars = chart.getDataList();
    const half = chart.getBarSpace().bar / 2;
    ctx.save();
    ctx.setLineDash([4, 3]);
    for (const [key, color] of [["upper", "#16a34a"], ["lower", "#dc2626"]] as const) {
      ctx.strokeStyle = color;
      ctx.beginPath();
      for (let i = Math.max(from, 0); i < Math.min(to, bars.length); i++) {
        const limit = byDate.get(dateOf(bars[i].timestamp));
        if (!limit) continue;
        const x = xAxis.convertTimestampToPixel(bars[i].timestamp);
        const y = yAxis.convertToPixel(limit[key]);
        ctx.moveTo(x - half, y);
        ctx.lineTo(x + half, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    return true;
  }),
};

export const ACTIONS: IndicatorDef = {
  name: "NEPSE_ACTIONS",
  label: "Bonus / dividend / right markers",
  main: true,
  register: layer("NEPSE_ACTIONS", ({ ctx, chart, xAxis, yAxis }) => {
    const bars = chart.getDataList();
    const dates = bars.map((b) => dateOf(b.timestamp));
    ctx.save();
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    for (const a of getLayerData(chart).actions) {
      const i = barOnOrAfter(dates, a.date);
      if (i < 0) continue;
      const x = xAxis.convertTimestampToPixel(bars[i].timestamp);
      const text = actionLabel(a);
      const w = ctx.measureText(text).width + 8;
      const y = yAxis.convertToPixel(bars[i].high) - 22;
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(x - w / 2, y, w, 16);
      ctx.fillStyle = "#fff";
      ctx.fillText(text, x, y + 12);
      ctx.strokeStyle = "#2563eb";
      ctx.beginPath();
      ctx.moveTo(x, y + 16);
      ctx.lineTo(x, y + 20);
      ctx.stroke();
    }
    ctx.restore();
    return true;
  }),
};

export const VOLUME_PROFILE: IndicatorDef = {
  name: "NEPSE_VPROFILE",
  label: "Volume profile (floorsheet)",
  main: true,
  register: layer("NEPSE_VPROFILE", ({ ctx, chart, bounding, yAxis }) => {
    const p = getLayerData(chart).profile;
    if (!p?.bins.length) return true;
    const max = Math.max(...p.bins.map((b) => b.qty));
    ctx.save();
    p.bins.forEach((b, i) => {
      const top = yAxis.convertToPixel(b.high);
      const w = profileWidth(b.qty, max, bounding.width * 0.3);
      ctx.fillStyle = i === p.poc ? "rgba(234,179,8,0.55)" : "rgba(59,130,246,0.35)";
      ctx.fillRect(bounding.width - w, top, w, Math.max(yAxis.convertToPixel(b.low) - top - 1, 1));
    });
    ctx.restore();
    return true;
  }),
};
