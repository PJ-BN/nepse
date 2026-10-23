"use client";

import type { OverlayMode } from "klinecharts";
import { useState } from "react";

export const DRAWING_GROUPS: { label: string; tools: { name: string; label: string }[] }[] = [
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

// Overlay indicators draw on the price pane; the rest get their own pane.
export const MAIN_INDICATORS = ["MA", "EMA", "SMA", "BOLL", "SAR", "BBI"];
export const SUB_INDICATORS = [
  "VOL", "MACD", "RSI", "KDJ", "WR", "CCI", "DMI", "OBV", "ROC", "MTM", "TRIX", "AO", "BIAS", "PSY", "VR", "DMA", "EMV", "PVT", "BRAR", "CR",
];

export const CHART_TYPES = [
  { value: "candle_solid", label: "Candles" },
  { value: "candle_stroke", label: "Hollow" },
  { value: "candle_up_stroke", label: "Hollow up" },
  { value: "ohlc", label: "OHLC bars" },
  { value: "area", label: "Area" },
] as const;

const btn = "rounded border px-2 py-1 text-xs hover:bg-foreground/10";
const on = "bg-foreground text-background hover:bg-foreground";

export function DrawingToolbar({
  active,
  magnet,
  locked,
  hidden,
  onPick,
  onMagnet,
  onLock,
  onHide,
  onUndo,
  onClear,
}: {
  active: string | null;
  magnet: OverlayMode;
  locked: boolean;
  hidden: boolean;
  onPick: (name: string) => void;
  onMagnet: () => void;
  onLock: () => void;
  onHide: () => void;
  onUndo: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex w-28 shrink-0 flex-col gap-2 overflow-y-auto text-xs" aria-label="Drawing tools">
      {DRAWING_GROUPS.map((g) => (
        <div key={g.label} className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-gray-500">{g.label}</span>
          {g.tools.map((t) => (
            <button key={t.name} type="button" aria-pressed={active === t.name} onClick={() => onPick(t.name)} className={`${btn} text-left ${active === t.name ? on : ""}`}>
              {t.label}
            </button>
          ))}
        </div>
      ))}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wide text-gray-500">Controls</span>
        <button type="button" aria-pressed={magnet !== "normal"} onClick={onMagnet} className={`${btn} text-left ${magnet !== "normal" ? on : ""}`}>
          Magnet: {magnet === "normal" ? "off" : magnet === "weak_magnet" ? "weak" : "strong"}
        </button>
        <button type="button" aria-pressed={locked} onClick={onLock} className={`${btn} text-left ${locked ? on : ""}`}>Lock drawings</button>
        <button type="button" aria-pressed={hidden} onClick={onHide} className={`${btn} text-left ${hidden ? on : ""}`}>Hide drawings</button>
        <button type="button" onClick={onUndo} className={`${btn} text-left`}>Remove last</button>
        <button type="button" onClick={onClear} className={`${btn} text-left`}>Clear all</button>
        <span className="text-[10px] text-gray-500">Right-click a drawing to delete it.</span>
      </div>
    </div>
  );
}

export function IndicatorMenu({ active, onToggle }: { active: Set<string>; onToggle: (name: string, main: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const match = (n: string) => n.toLowerCase().includes(q.trim().toLowerCase());
  return (
    <div className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={btn}>
        Indicators ({active.size})
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded border bg-background p-2 shadow-lg">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="mb-2 w-full rounded border px-2 py-1 text-xs" />
          <div className="max-h-72 overflow-y-auto">
            {([["On price", MAIN_INDICATORS, true], ["Separate pane", SUB_INDICATORS, false]] as const).map(([label, names, main]) => (
              <div key={label} className="mb-2">
                <span className="text-[10px] uppercase tracking-wide text-gray-500">{label}</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {names.filter(match).map((n) => (
                    <button key={n} type="button" aria-pressed={active.has(n)} onClick={() => onToggle(n, main)} className={`${btn} ${active.has(n) ? on : ""}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
