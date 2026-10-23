import type { DrawingDef } from "./index";
import { type XY, harmonicRatios } from "./geometry";
import { BLUE, fill, lines, texts } from "./shared";

const NAMES = ["X", "A", "B", "C", "D"];
// Dashed ratio legs: X–B, A–C, B–D, X–D (drawn once both ends exist).
const LEGS = [[0, 2], [1, 3], [2, 4], [0, 4]];

/** XABCD polyline with the AB/XA, BC/AB, CD/BC and AD/XA ratios, 5 clicks. */
export const harmonic: DrawingDef = {
  name: "harmonic",
  label: "XABCD pattern",
  register: (k) =>
    k.registerOverlay({
      name: "harmonic",
      totalStep: 6,
      needDefaultPointFigure: true,
      needDefaultXAxisFigure: true,
      needDefaultYAxisFigure: true,
      createPointFigures: ({ coordinates: c, overlay }) => {
        const out = [lines([c]), texts(c.map((p, i) => ({ x: p.x, y: p.y - 6, text: NAMES[i], align: "center" })))];
        if (c.length < 3) return out;
        out.push(fill(c.slice(0, 3), BLUE));
        if (c.length >= 4) out.push(fill(c.slice(2, 5), BLUE));
        const legs = LEGS.filter(([, b]) => c[b]);
        out.push(lines(legs.map(([a, b]) => [c[a], c[b]]), true));
        const v = overlay.points.map((p) => p.value);
        if (v.length === 5 && v.every((x) => x !== undefined)) {
          const r = harmonicRatios(v as number[]);
          const mid = (a: XY, b: XY) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
          out.push(texts(legs.map(([a, b], i) => ({ ...mid(c[a], c[b]), text: [r.ab, r.bc, r.cd, r.ad][i].toFixed(3), align: "center" }))));
        }
        return out;
      },
    }),
};
