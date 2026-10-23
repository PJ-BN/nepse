import type { Kline } from "../types";
import { CUSTOM_GROUPS } from "./custom";

/** One drawing tool. `register` adds a custom overlay template to klinecharts; built-ins need none. */
export type DrawingDef = { name: string; label: string; register?: (k: Kline) => void };
export type DrawingGroup = { label: string; tools: DrawingDef[] };

const BUILTIN_GROUPS: DrawingGroup[] = [
  {
    label: "Lines",
    tools: [
      { name: "segment", label: "Trend line" },
      { name: "rayLine", label: "Ray" },
      { name: "straightLine", label: "Extended line" },
      { name: "horizontalStraightLine", label: "Horizontal line" },
      { name: "horizontalRayLine", label: "Horizontal ray" },
      { name: "horizontalSegment", label: "Horizontal segment" },
      { name: "verticalStraightLine", label: "Vertical line" },
      { name: "verticalSegment", label: "Vertical segment" },
      { name: "priceLine", label: "Price line" },
    ],
  },
  {
    label: "Channels & Fib",
    tools: [
      { name: "parallelStraightLine", label: "Parallel channel" },
      { name: "priceChannelLine", label: "Price channel" },
      { name: "fibonacciLine", label: "Fib retracement" },
    ],
  },
  {
    label: "Shapes & notes",
    tools: [
      { name: "rect", label: "Rectangle" },
      { name: "circle", label: "Circle" },
      { name: "polygon", label: "Polygon" },
      { name: "arc", label: "Arc" },
      { name: "text", label: "Text" },
      { name: "simpleAnnotation", label: "Annotation" },
      { name: "simpleTag", label: "Tag" },
    ],
  },
];

/** Custom tools are merged into the group with the same label, or appended as a new group. */
export const DRAWING_GROUPS: DrawingGroup[] = [...BUILTIN_GROUPS, ...CUSTOM_GROUPS].reduce<DrawingGroup[]>((out, g) => {
  const hit = out.find((o) => o.label === g.label);
  if (hit) hit.tools = [...hit.tools, ...g.tools];
  else out.push({ ...g, tools: [...g.tools] });
  return out;
}, []);

let done = false;
export function registerOverlays(k: Kline) {
  if (done) return;
  done = true;
  DRAWING_GROUPS.forEach((g) => g.tools.forEach((t) => t.register?.(k)));
}
