import type { Chart } from "klinecharts";
import type { CircuitLimit, CorporateAction, VolumeProfile } from "./api";

/** Layer data per chart, read by the indicators' draw callbacks (which only receive the chart, not React state). */
export type LayerData = { circuit: CircuitLimit[]; actions: CorporateAction[]; profile: VolumeProfile | null };

const EMPTY: LayerData = { circuit: [], actions: [], profile: null };
const store = new Map<string, LayerData>();

export const getLayerData = (chart: Chart) => store.get(chart.id) ?? EMPTY;

export function setLayerData(chart: Chart, patch: Partial<LayerData>) {
  store.set(chart.id, { ...getLayerData(chart), ...patch });
  chart.resize(); // klinecharts has no explicit redraw; resize repaints every pane
}

export const clearLayerData = (chart: Chart) => void store.delete(chart.id);
