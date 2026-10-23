import type { DrawingDef } from "./index";
import { FIB_EXTENSION, fibExtension } from "./geometry";
import { lines, price, texts } from "./shared";

export const fibExtensionTool: DrawingDef = {
  name: "fibExtension",
  label: "Fib extension",
  register: (k) =>
    k.registerOverlay({
      name: "fibExtension",
      totalStep: 4, // A, B, C
      needDefaultPointFigure: true,
      needDefaultXAxisFigure: true,
      needDefaultYAxisFigure: true,
      createPointFigures: ({ chart, coordinates, overlay, bounding }) => {
        const out = [lines([coordinates], true)];
        const [a, b, c] = coordinates;
        const v = overlay.points.map((p) => p.value);
        if (c && v.length === 3 && v.every((x) => x !== undefined)) {
          const levels = fibExtension(v[0]!, v[1]!, v[2]!);
          const ys = FIB_EXTENSION.map((r) => c.y + (b.y - a.y) * r);
          out.push(lines(ys.map((y) => [{ x: c.x, y }, { x: bounding.width, y }])));
          out.push(texts(levels.map((l, i) => ({ x: c.x, y: ys[i], text: `${price(chart, l.value)} (${(l.ratio * 100).toFixed(1)}%)` }))));
        }
        return out;
      },
    }),
};
