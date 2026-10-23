import type { DrawingDef } from "./index";
import { type XY, atX, pitchfork as fork } from "./geometry";
import { lines } from "./shared";

export const pitchfork: DrawingDef = {
  name: "pitchfork",
  label: "Pitchfork",
  register: (k) =>
    k.registerOverlay({
      name: "pitchfork",
      totalStep: 4, // handle, then the two reaction points
      needDefaultPointFigure: true,
      needDefaultXAxisFigure: true,
      needDefaultYAxisFigure: true,
      createPointFigures: ({ coordinates, bounding }) => {
        const [p0, p1, p2] = coordinates;
        if (!p1) return [];
        if (!p2) return [lines([[p0, p1]])];
        const f = fork(p0, p1, p2);
        const far = (s: [XY, XY]) => [s[0], atX(s[0], s[1], bounding.width)];
        return [lines([far(f.median), far(f.upper), far(f.lower)]), lines([[p1, p2]], true)];
      },
    }),
};
