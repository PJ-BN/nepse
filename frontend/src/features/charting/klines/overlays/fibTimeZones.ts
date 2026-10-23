import type { DrawingDef } from "./index";
import { FIB_TIME } from "./geometry";
import { lines, texts } from "./shared";

export const fibTimeZones: DrawingDef = {
  name: "fibTimeZones",
  label: "Fib time zones",
  register: (k) =>
    k.registerOverlay({
      name: "fibTimeZones",
      totalStep: 3, // origin, the 1-unit distance
      needDefaultPointFigure: true,
      needDefaultXAxisFigure: true,
      needDefaultYAxisFigure: false,
      createPointFigures: ({ coordinates, bounding }) => {
        const [a, b] = coordinates;
        if (!b) return [];
        const zones = FIB_TIME.map((n) => ({ n, x: a.x + n * (b.x - a.x) })).filter((z) => z.x >= 0 && z.x <= bounding.width);
        return [
          lines(zones.map((z) => [{ x: z.x, y: 0 }, { x: z.x, y: bounding.height }])),
          texts(zones.map((z) => ({ x: z.x, y: 14, text: String(z.n), align: "center" }))),
        ];
      },
    }),
};
