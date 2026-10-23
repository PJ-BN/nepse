import type { DrawingDef } from "./index";
import { position as calc } from "./geometry";
import { GREEN, RED, fill, lines, price, texts } from "./shared";

/** Entry, stop, target (3 clicks); long vs short follows from whether the target is above or below entry. */
export const position: DrawingDef = {
  name: "position",
  label: "Long / short position",
  register: (k) =>
    k.registerOverlay({
      name: "position",
      totalStep: 4,
      needDefaultPointFigure: true,
      needDefaultXAxisFigure: true,
      needDefaultYAxisFigure: true,
      createPointFigures: ({ chart, coordinates, overlay }) => {
        const [entry, stop, target] = coordinates;
        if (!stop) return [];
        const x0 = entry.x;
        const x1 = stop.x === x0 ? x0 + 120 : stop.x; // the stop click also sets the box width
        const box = (y: number) => [{ x: x0, y: entry.y }, { x: x1, y: entry.y }, { x: x1, y }, { x: x0, y }];
        if (!target) return [fill(box(stop.y), RED), lines([[{ x: x0, y: entry.y }, { x: x1, y: entry.y }]], true)];
        const [e, s, t] = overlay.points.map((p) => p.value);
        if (e === undefined || s === undefined || t === undefined) return [];
        const r = calc(e, s, t);
        const edge = (y: number) => [{ x: x0, y }, { x: x1, y }];
        return [
          fill(box(target.y), GREEN),
          fill(box(stop.y), RED),
          lines([edge(entry.y), edge(target.y), edge(stop.y)]),
          texts([
            { x: x0 + 4, y: target.y - 2, text: `Target ${price(chart, t)} (${r.rewardPct.toFixed(2)}%)` },
            { x: x0 + 4, y: stop.y + (r.long ? 14 : -2), text: `Stop ${price(chart, s)} (${r.riskPct.toFixed(2)}%)${r.valid ? "" : " ⚠ wrong side"}` },
            { x: x0 + 4, y: entry.y - 2, text: `${r.long ? "Long" : "Short"} ${price(chart, e)} · R:R ${r.rr.toFixed(2)}` },
          ]),
        ];
      },
    }),
};
