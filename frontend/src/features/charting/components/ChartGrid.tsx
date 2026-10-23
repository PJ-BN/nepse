"use client";

import type { Chart } from "klinecharts";
import { useCallback, useEffect, useState } from "react";
import { loadAlerts, saveAlerts, type Alert } from "../alerts";
import { useChartSync } from "../hooks/useChartSync";
import { DEFAULT_INDICATORS, type Indicator, type IndicatorType } from "../types";
import { AlertToasts } from "./Alerts";
import { ChartView } from "./ChartView";

const MAX_CHARTS = 6;
const KEY = "chart.indicators";
const LABEL: Record<IndicatorType, string> = { sma: "SMA", ema: "EMA", bb: "Bollinger", rsi: "RSI", macd: "MACD" };
const SIZES = { fit: "Fit screen", tall: "Tall", medium: "Medium", compact: "Compact" } as const;
type Size = keyof typeof SIZES;

const name = (i: Indicator) => (i.type === "macd" ? "MACD 12/26/9" : `${LABEL[i.type]} ${i.period}`);

/** Several chart panels on one page, sharing one indicator list. */
export function ChartGrid({ initial }: { initial: string[] }) {
  const [symbols, setSymbols] = useState(initial.length ? initial : [""]);
  const [cols, setCols] = useState(initial.length > 1 ? 2 : 1);
  const [size, setSize] = useState<Size>("fit");
  const [indicators, setIndicators] = useState<Indicator[]>(DEFAULT_INDICATORS);
  const [sync, setSync] = useState(false);
  const [charts, setCharts] = useState<(Chart | null)[]>([]);
  const [alerts, setAlertsState] = useState<Alert[]>([]);
  const [draft, setDraft] = useState<{ type: IndicatorType; period: number; color: string }>({ type: "ema", period: 9, color: "#10b981" });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setIndicators(JSON.parse(saved));
    } catch {
      // storage unavailable or corrupt: keep defaults
    }
  }, []);
  const saveIndicators = (next: Indicator[]) => {
    setIndicators(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // storage unavailable: indicators just won't persist
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

  const rows = Math.ceil(symbols.length / cols);
  const height = {
    fit: `calc((100vh - 230px) / ${rows})`,
    tall: "720px",
    medium: "520px",
    compact: "380px",
  }[size];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <button
          type="button"
          disabled={symbols.length >= MAX_CHARTS}
          onClick={() => {
            update([...symbols, ""]);
            if (symbols.length === 1) setCols(2);
          }}
          className="rounded border px-3 py-1 hover:bg-hover disabled:opacity-40"
        >
          + Add chart
        </button>
        <label className="flex items-center gap-1">
          Columns
          <select value={cols} onChange={(e) => setCols(Number(e.target.value))} className="rounded border px-1 py-1">
            {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Size
          <select value={size} onChange={(e) => setSize(e.target.value as Size)} className="rounded border px-1 py-1">
            {Object.entries(SIZES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1" title="Mirror scroll, zoom and crosshair across the charts">
          <input type="checkbox" checked={sync} onChange={(e) => setSync(e.target.checked)} />
          Sync charts
        </label>
        <span className="text-gray-500">Drag a chart&apos;s bottom edge to resize it.</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium">Indicators</span>
        {indicators.map((i) => (
          <span key={i.id} className="flex items-center gap-1 rounded border px-2 py-0.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: i.color }} />
            {name(i)}
            <button type="button" aria-label={`Remove ${name(i)}`} onClick={() => saveIndicators(indicators.filter((x) => x.id !== i.id))}>
              ✕
            </button>
          </span>
        ))}
        <select
          aria-label="Indicator type"
          value={draft.type}
          onChange={(e) => setDraft({ ...draft, type: e.target.value as IndicatorType })}
          className="rounded border px-1 py-1"
        >
          {(Object.keys(LABEL) as IndicatorType[]).map((t) => <option key={t} value={t}>{LABEL[t]}</option>)}
        </select>
        {draft.type !== "macd" && (
          <input
            type="number"
            min={2}
            max={500}
            aria-label="Period"
            value={draft.period}
            onChange={(e) => setDraft({ ...draft, period: Math.max(2, Number(e.target.value) || 2) })}
            className="w-16 rounded border px-1 py-1"
          />
        )}
        <input type="color" aria-label="Colour" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} className="h-6 w-8" />
        <button
          type="button"
          className="rounded border px-3 py-1 hover:bg-hover"
          onClick={() => saveIndicators([...indicators, { ...draft, id: `${draft.type}${draft.period}-${Date.now()}` }])}
        >
          Add
        </button>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {symbols.map((s, i) => (
          <ChartView
            key={i}
            symbol={s}
            indicators={indicators}
            height={height}
            onChart={(c) => setCharts((p) => Object.assign([...p], { [i]: c }))}
            alerts={alerts}
            onAddAlert={(a) => setAlerts([...alerts, a])}
            onRemoveAlert={(id) => setAlerts(alerts.filter((a) => a.id !== id))}
            onSymbolChange={(v) => update(symbols.map((x, j) => (j === i ? v : x)))}
            onRemove={symbols.length > 1 ? () => update(symbols.filter((_, j) => j !== i)) : undefined}
          />
        ))}
      </div>
      <AlertToasts alerts={alerts} onChange={setAlerts} />
    </div>
  );
}
