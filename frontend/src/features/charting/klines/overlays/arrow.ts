import type { DrawingDef } from "./index";
import { arrowHead } from "./geometry";
import { lines } from "./shared";

export const arrow: DrawingDef = {
  name: "arrow",
  label: "Arrow",
  register: (k) =>
    k.registerOverlay({
      name: "arrow",
      totalStep: 3,
      needDefaultPointFigure: true,
      needDefaultXAxisFigure: true,
      needDefaultYAxisFigure: true,
      createPointFigures: ({ coordinates }) => {
        const [a, b] = coordinates;
        return b ? [lines([[a, b], arrowHead(a, b)])] : [];
      },
    }),
};
