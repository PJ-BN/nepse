import type { DrawingGroup } from "./index";
import { arrow } from "./arrow";
import { elliottWave } from "./elliott";
import { fibChannel } from "./fibChannel";
import { fibExtensionTool } from "./fibExtension";
import { fibTimeZones } from "./fibTimeZones";
import { gannFan } from "./gannFan";
import { harmonic } from "./harmonic";
import { measure } from "./measure";
import { pitchfork } from "./pitchfork";
import { position } from "./position";

// Drawing tools klinecharts doesn't ship (fib extension, pitchfork, long/short position, ...). One file each, listed here.
// Freehand "brush" is built into klinecharts v10, so it's only a menu entry.
export const CUSTOM_GROUPS: DrawingGroup[] = [
  { label: "Lines", tools: [arrow] },
  { label: "Channels & Fib", tools: [fibExtensionTool, fibChannel, fibTimeZones, gannFan, pitchfork] },
  { label: "Shapes & notes", tools: [{ name: "brush", label: "Brush" }] },
  { label: "Measure & position", tools: [measure, position] },
  { label: "Patterns", tools: [elliottWave, harmonic] },
];
