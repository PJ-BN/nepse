import type { DrawingDef } from "./index";
import { measure as calc } from "./geometry";
import { BLUE, RED, day, fill, lines, price, texts } from "./shared";

export const measure: DrawingDef = {
  name: "measure",
  label: "Measure",
  register: (k) =>
    k.registerOverlay({
      name: "measure",
      totalStep: 3,
      needDefaultPointFigure: true,
      needDefaultXAxisFigure: true,
      needDefaultYAxisFigure: true,
      createPointFigures: ({ chart, coordinates, overlay }) => {
        const [a, b] = coordinates;
        const [pa, pb] = overlay.points;
        if (!b || pa?.value === undefined || pb?.value === undefined) return [];
        const m = calc({ value: pa.value, bars: pa.dataIndex }, { value: pb.value, bars: pb.dataIndex });
        const sign = m.price >= 0 ? "+" : "";
        const label = `${sign}${price(chart, m.price)} (${sign}${m.pct.toFixed(2)}%) · ${m.bars} bars · ${day(pa.timestamp)} → ${day(pb.timestamp)}`;
        return [
          fill([a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }], m.price >= 0 ? BLUE : RED),
          lines([[a, b]], true),
          texts([{ x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 4, text: label, align: "center" }]),
        ];
      },
    }),
};
