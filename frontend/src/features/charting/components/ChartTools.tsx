"use client";

import type { OverlayMode } from "klinecharts";
import { useState } from "react";
import { INDICATORS } from "../klines/indicators";
import { DRAWING_GROUPS } from "../klines/overlays";

export const CHART_TYPES = [
  { value: "candle_solid", label: "Candles" },
  { value: "candle_stroke", label: "Hollow" },
  { value: "candle_up_stroke", label: "Hollow up" },
  { value: "ohlc", label: "OHLC bars" },
  { value: "area", label: "Area" },
] as const;

const btn = "rounded border px-2 py-1 text-xs hover:bg-foreground/10";
const on = "border-blue-500 bg-blue-500/20";

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
            {([["On price", true], ["Separate pane", false]] as const).map(([label, main]) => (
              <div key={label} className="mb-2">
                <span className="text-[10px] uppercase tracking-wide text-gray-500">{label}</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {INDICATORS.filter((i) => i.main === main && match(i.label ?? i.name)).map(({ name: n, label }) => (
                    <button key={n} type="button" aria-pressed={active.has(n)} onClick={() => onToggle(n, main)} className={`${btn} ${active.has(n) ? on : ""}`}>
                      {label ?? n}
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
