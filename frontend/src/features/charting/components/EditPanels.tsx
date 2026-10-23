"use client";

import type { Chart, Overlay } from "klinecharts";
import { useState } from "react";
import { EXTEND_LABELS, extendOf } from "../drawings";
import { applyParams, lineColor, type ChartSettings, type IndicatorParams, type Layouts } from "../settings";

const btn = "rounded border px-2 py-1 text-xs hover:bg-foreground/10";
const panel = "rounded border bg-background p-2 text-xs shadow-lg";
const HEX = /^#[0-9a-f]{6}$/i;
const hex = (c: unknown, fallback: string) => (typeof c === "string" && HEX.test(c) ? c : fallback);

/** Edits the selected drawing. Style edits go through `onStyle`, which overrides the overlay and persists it. */
export function PropertiesPanel({
  overlay,
  allTimeframes,
  onStyle,
  onExtend,
  onAllTimeframes,
  onDelete,
}: {
  overlay: Overlay;
  allTimeframes: boolean;
  onStyle: (styles: Record<string, unknown>) => void;
  onExtend: (level: number) => void;
  onAllTimeframes: (on: boolean) => void;
  onDelete: () => void;
}) {
  const s = (overlay.styles ?? {}) as { line?: { color?: string; size?: number; style?: string } };
  const color = hex(s.line?.color, "#3b82f6");
  const size = s.line?.size ?? 1;
  const style = s.line?.style ?? "solid";
  const ext = extendOf(overlay.name);
  // One edit styles every figure kind a tool might draw (lines, shape borders, text).
  const set = (c: string, w: number, d: string) =>
    onStyle({
      line: { color: c, size: w, style: d },
      rect: { borderColor: c, borderSize: w, borderStyle: d },
      polygon: { borderColor: c, borderSize: w, borderStyle: d },
      circle: { borderColor: c, borderSize: w, borderStyle: d },
      arc: { color: c, size: w, style: d },
      text: { color: c },
    });
  return (
    <div className={`${panel} flex flex-wrap items-center gap-3`} aria-label="Drawing properties">
      <span className="font-medium">{overlay.name}</span>
      <label className="flex items-center gap-1">
        Colour
        <input type="color" value={color} onChange={(e) => set(e.target.value, size, style)} />
      </label>
      <label className="flex items-center gap-1">
        Width
        <input type="number" min={1} max={8} value={size} onChange={(e) => set(color, Math.min(8, Math.max(1, Number(e.target.value) || 1)), style)} className="w-12 rounded border px-1 py-0.5" />
      </label>
      <label className="flex items-center gap-1">
        Line
        <select value={style} onChange={(e) => set(color, size, e.target.value)} className="rounded border bg-background px-1 py-0.5">
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
        </select>
      </label>
      {ext && (
        <label className="flex items-center gap-1">
          Extend
          <select value={ext.level} onChange={(e) => onExtend(Number(e.target.value))} className="rounded border bg-background px-1 py-0.5">
            {EXTEND_LABELS.map((l, i) => <option key={l} value={i}>{l}</option>)}
          </select>
        </label>
      )}
      <label className="flex items-center gap-1">
        <input type="checkbox" checked={allTimeframes} onChange={(e) => onAllTimeframes(e.target.checked)} />
        Show on all timeframes
      </label>
      <button type="button" onClick={onDelete} className={`${btn} text-red-600`}>Delete</button>
    </div>
  );
}

/** Params, colours and removal for every indicator currently on the chart. */
export function IndicatorSettings({
  chart,
  params,
  onParams,
  onRemove,
}: {
  chart: Chart;
  params: Record<string, IndicatorParams>;
  onParams: (name: string, p: IndicatorParams) => void;
  onRemove: (name: string) => void;
}) {
  return (
    <div className={`${panel} w-80 space-y-2`} aria-label="Indicator settings">
      {chart.getIndicators().length === 0 && <p className="text-gray-500">No indicators on the chart.</p>}
      {chart.getIndicators().map((ind) => {
        const saved = params[ind.name] ?? {};
        const lines = ind.figures.filter((f) => f.type === "line").length;
        const patch = (p: IndicatorParams) => {
          const next = { ...saved, ...p };
          applyParams(chart, ind, next);
          onParams(ind.name, next);
        };
        return (
          <div key={ind.id} className="flex flex-wrap items-center gap-2 border-b pb-2 last:border-0">
            <span className="w-14 font-medium">{ind.shortName || ind.name}</span>
            {ind.calcParams.map((v, i) => (
              <input
                key={i}
                type="number"
                aria-label={`${ind.name} parameter ${i + 1}`}
                value={Number(v)}
                min={1}
                onChange={(e) => patch({ calcParams: ind.calcParams.map((o, j) => (j === i ? Math.max(1, Number(e.target.value) || 1) : Number(o))) })}
                className="w-14 rounded border px-1 py-0.5"
              />
            ))}
            {Array.from({ length: lines }, (_, i) => (
              <input
                key={i}
                type="color"
                aria-label={`${ind.name} line ${i + 1} colour`}
                value={hex(saved.colors?.[i], hex(lineColor(chart, ind, i), "#888888"))}
                onChange={(e) => patch({ colors: Array.from({ length: lines }, (_, j) => (j === i ? e.target.value : saved.colors?.[j] ?? "")) })}
              />
            ))}
            <button type="button" onClick={() => onRemove(ind.name)} className={`${btn} ml-auto`}>Remove</button>
          </div>
        );
      })}
    </div>
  );
}

/** Save the current indicators/type/scale under a name; load or delete saved ones. */
export function LayoutMenu({
  layouts,
  onSave,
  onLoad,
  onDelete,
}: {
  layouts: Layouts;
  onSave: (name: string) => void;
  onLoad: (s: ChartSettings) => void;
  onDelete: (name: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <div className={`${panel} w-64 space-y-2`} aria-label="Layout templates">
      <form
        className="flex gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) {
            onSave(name.trim());
            setName("");
          }
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" className="min-w-0 flex-1 rounded border px-2 py-1" />
        <button type="submit" className={btn}>Save</button>
      </form>
      {Object.keys(layouts).length === 0 && <p className="text-gray-500">No saved templates.</p>}
      {Object.entries(layouts).map(([n, s]) => (
        <div key={n} className="flex items-center gap-1">
          <span className="min-w-0 flex-1 truncate">{n}</span>
          <button type="button" onClick={() => onLoad(s)} className={btn}>Load</button>
          <button type="button" aria-label={`Delete ${n}`} onClick={() => onDelete(n)} className={btn}>✕</button>
        </div>
      ))}
    </div>
  );
}
