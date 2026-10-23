/** Chart settings shared by every chart on the page, plus named layout templates built from them. */
export type IndicatorParams = { calcParams?: number[]; colors?: string[] };

export type ChartSettings = {
  /** Indicators added from the menu (the grid's own list is separate). */
  extras: string[];
  /** Indicators the user removed from the pane, including grid-owned ones and VOL. */
  removed: string[];
  params: Record<string, IndicatorParams>;
  type: string;
  axis: string;
};

export const DEFAULT_SETTINGS: ChartSettings = { extras: [], removed: [], params: {}, type: "candle_solid", axis: "normal" };

const SETTINGS_KEY = "nepse:chart:settings";
const LAYOUTS_KEY = "nepse:chart:layouts";

function read(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable: settings just won't persist
  }
}

/** Tolerates missing or stale fields so older saves keep loading. */
export const normalize = (raw: unknown): ChartSettings => ({ ...DEFAULT_SETTINGS, ...(raw && typeof raw === "object" ? raw : {}) });

export const loadSettings = () => normalize(read(SETTINGS_KEY));
export const saveSettings = (s: ChartSettings) => write(SETTINGS_KEY, s);

export type Layouts = Record<string, ChartSettings>;
export const loadLayouts = (): Layouts => {
  const raw = read(LAYOUTS_KEY);
  return raw && typeof raw === "object" ? Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, normalize(v)])) : {};
};
export const saveLayout = (name: string, s: ChartSettings): Layouts => {
  const next = { ...loadLayouts(), [name]: s };
  write(LAYOUTS_KEY, next);
  return next;
};
export const deleteLayout = (name: string): Layouts => {
  const rest = loadLayouts();
  delete rest[name];
  write(LAYOUTS_KEY, rest);
  return rest;
};

type Line = { color: string };
type Ind = { name: string; paneId: string; figures: { type?: string }[]; styles?: unknown };

/** A line's current colour: the indicator's own style (e.g. from the grid's list), else the chart default. */
export function lineColor(chart: import("klinecharts").Chart, ind: Ind, i: number): string {
  const own = (ind.styles as { lines?: Line[] } | null | undefined)?.lines;
  const defaults = chart.getStyles().indicator.lines as unknown as Line[];
  return own?.[i]?.color ?? defaults[i % defaults.length].color;
}

/** Push saved params/colours onto a live indicator. Colours are sparse: "" keeps the line as it is. */
export function applyParams(chart: import("klinecharts").Chart, ind: Ind, p: IndicatorParams) {
  const lines = ind.figures.filter((f) => f.type === "line").length;
  const defaults = chart.getStyles().indicator.lines as unknown as Line[];
  const colors = p.colors ?? [];
  chart.overrideIndicator({
    name: ind.name,
    paneId: ind.paneId,
    ...(p.calcParams?.length && { calcParams: p.calcParams }),
    ...(colors.some(Boolean) && {
      styles: { lines: Array.from({ length: lines }, (_, i) => ({ ...defaults[i % defaults.length], color: colors[i] || lineColor(chart, ind, i) })) },
    }),
  } as never);
}
