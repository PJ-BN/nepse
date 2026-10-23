import type { DrawingDef } from "./index";
import { lines, texts } from "./shared";

const LABELS = ["0", "1", "2", "3", "4", "5"];

/** Five-wave impulse polyline, 6 clicks. */
export const elliottWave: DrawingDef = {
  name: "elliottWave",
  label: "Elliott wave",
  register: (k) =>
    k.registerOverlay({
      name: "elliottWave",
      totalStep: 7,
      needDefaultPointFigure: true,
      needDefaultXAxisFigure: true,
      needDefaultYAxisFigure: true,
      createPointFigures: ({ coordinates }) => [lines([coordinates]), texts(coordinates.map((c, i) => ({ x: c.x, y: c.y - 6, text: `(${LABELS[i]})`, align: "center" })))],
    }),
};
