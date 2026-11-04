"use client";

import type { Chart } from "klinecharts";
import { useCallback, useEffect, useState } from "react";
import { loadAlerts, saveAlerts, type Alert } from "../alerts";
import { useChartSync } from "../hooks/useChartSync";
import { DEFAULT_INDICATORS, type Indicator } from "../types";
import { AlertToasts } from "./Alerts";
import { ChartView } from "./ChartView";

const MAX_CHARTS = 6;
const KEY = "nepse:chart:indicators:v2";

/** Fullscreen multi-panel technical chart grid with zero page overflow. */
export function ChartGrid({ initial }: { initial: string[] }) {
  const [symbols, setSymbols] = useState<string[]>(() => {
    if (initial.length) return initial;
    return ["NEPSE"];
  });
  const [cols, setCols] = useState(initial.length > 1 ? 2 : 1);
  const [indicators, setIndicators] = useState<Indicator[]>(DEFAULT_INDICATORS);
  const [sync, setSync] = useState(false);
  const [charts, setCharts] = useState<(Chart | null)[]>([]);
  const [alerts, setAlertsState] = useState<Alert[]>([]);
  const [showGridBar, setShowGridBar] = useState(false);

  // Clean view at first: load saved indicators or default to empty list
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        setIndicators(JSON.parse(saved));
      }
    } catch {
      // storage unavailable
    }
  }, []);

  const saveIndicators = (next: Indicator[]) => {
    setIndicators(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // storage unavailable
    }
  };

  useEffect(() => setAlertsState(loadAlerts()), []);
  const setAlerts = useCallback((next: Alert[]) => {
    setAlertsState(next);
    saveAlerts(next);
  }, []);

  useChartSync(charts, sync);

  const update = (next: string[]) => {
    setSymbols(next);
    const q = next.filter(Boolean).join(",");
    history.replaceState(null, "", q ? `/chart?symbols=${encodeURIComponent(q)}` : "/chart");
  };

  return (
    <div className="h-full w-full flex flex-col min-h-0 overflow-hidden bg-background">
      {/* Optional Multi-Chart Toolbar (only shown when multi-chart is toggled or symbols > 1) */}
      {(symbols.length > 1 || showGridBar) && (
        <div className="shrink-0 flex items-center justify-between border-b border-border/80 bg-muted/30 px-3 py-1.5 text-xs select-none">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-foreground">Multi-Chart Grid:</span>
            <button
              type="button"
              disabled={symbols.length >= MAX_CHARTS}
              onClick={() => {
                update([...symbols, ""]);
                if (symbols.length === 1) setCols(2);
              }}
              className="rounded-lg border border-border bg-card px-2.5 py-1 font-semibold hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
            >
              + Add Chart ({symbols.length}/{MAX_CHARTS})
            </button>
            <label className="flex items-center gap-1.5 text-muted-foreground font-medium">
              Columns:
              <select
                value={cols}
                onChange={(e) => setCols(Number(e.target.value))}
                className="rounded border border-border bg-card px-1.5 py-0.5 text-foreground"
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-muted-foreground font-medium cursor-pointer" title="Mirror scroll, zoom and crosshair across the charts">
              <input type="checkbox" checked={sync} onChange={(e) => setSync(e.target.checked)} className="rounded" />
              Sync Charts
            </label>
          </div>

          <div className="flex items-center gap-2">
            {symbols.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  update([symbols[0] || "NEPSE"]);
                  setCols(1);
                  setShowGridBar(false);
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
              >
                Reset to Single Chart
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowGridBar(false)}
              className="text-muted-foreground hover:text-foreground text-xs p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Grid of Charts */}
      <div
        className={`flex-1 min-h-0 w-full overflow-hidden ${
          symbols.length === 1
            ? "h-full flex flex-col"
            : `grid gap-1 grid-cols-1 ${
                cols === 2 ? "md:grid-cols-2" : cols === 3 ? "md:grid-cols-3" : "md:grid-cols-1"
              }`
        }`}
      >
        {symbols.map((s, i) => (
          <div key={i} className="h-full min-h-0 w-full flex flex-col overflow-hidden">
            <ChartView
              symbol={s}
              indicators={indicators}
              height="100%"
              onChart={(c) => setCharts((p) => Object.assign([...p], { [i]: c }))}
              alerts={alerts}
              onAddAlert={(a) => setAlerts([...alerts, a])}
              onRemoveAlert={(id) => setAlerts(alerts.filter((a) => a.id !== id))}
              onSymbolChange={(v) => update(symbols.map((x, j) => (j === i ? v : x)))}
              onApplyIndicators={saveIndicators}
              onRemove={
                symbols.length > 1
                  ? () => update(symbols.filter((_, j) => j !== i))
                  : undefined
              }
            />
          </div>
        ))}
      </div>

      <AlertToasts alerts={alerts} onChange={setAlerts} />
    </div>
  );
}
