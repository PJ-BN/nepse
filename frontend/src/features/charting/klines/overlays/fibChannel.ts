import type { DrawingDef } from "./index";
import { FIB_CHANNEL, atX, offsetFromLine } from "./geometry";
import { lines, texts } from "./shared";

export const fibChannel: DrawingDef = {
  name: "fibChannel",
  label: "Fib channel",
  register: (k) =>
    k.registerOverlay({
      name: "fibChannel",
      totalStep: 4, // baseline start, baseline end, channel width
      needDefaultPointFigure: true,
      needDefaultXAxisFigure: true,
      needDefaultYAxisFigure: true,
      createPointFigures: ({ coordinates, bounding }) => {
        const [a, b, c] = coordinates;
        if (!b) return [];
        if (!c) return [lines([[a, b]])];
        const w = offsetFromLine(a, b, c);
        const segs = FIB_CHANNEL.map((r) => {
          const s = { x: a.x, y: a.y + w * r };
          return [s, atX(s, { x: b.x, y: b.y + w * r }, bounding.width)];
        });
        return [lines(segs), texts(FIB_CHANNEL.map((r, i) => ({ x: a.x, y: segs[i][0].y, text: `${(r * 100).toFixed(1)}%` })))];
      },
    }),
};
