import type { DrawingDef } from "./index";
import { atX, gannRays } from "./geometry";
import { lines, texts } from "./shared";

export const gannFan: DrawingDef = {
  name: "gannFan",
  label: "Gann fan",
  register: (k) =>
    k.registerOverlay({
      name: "gannFan",
      totalStep: 3, // origin, a point defining the 1x1 angle
      needDefaultPointFigure: true,
      needDefaultXAxisFigure: true,
      needDefaultYAxisFigure: true,
      createPointFigures: ({ coordinates, bounding }) => {
        const [o, p] = coordinates;
        if (!p || p.x === o.x) return [];
        const rays = gannRays(o, p);
        const edge = p.x > o.x ? bounding.width : 0;
        return [lines(rays.map((r) => [o, atX(o, r.to, edge)])), texts(rays.map((r) => ({ x: r.to.x, y: r.to.y, text: r.label })))];
      },
    }),
};
