"use client";

import type { Chart } from "klinecharts";
import { useCallback, useEffect, useState } from "react";
import { loadAlerts, saveAlerts, type Alert } from "../alerts";
import { useChartSync } from "../hooks/useChartSync";
import { DEFAULT_INDICATORS, type Indicator, type IndicatorType } from "../types";
import { AlertToasts } from "./Alerts";
import { ChartView } from "./ChartView";
import { CreateIndicatorModal } from "./CreateIndicatorModal";

const MAX_CHARTS = 6;
const KEY = "chart.indicators";

export const INDICATOR_META: Record<IndicatorType, { symbol: string; label: string; hasPeriod: boolean }> = {
  sma: { symbol: "SMA", label: "Simple Moving Average", hasPeriod: true },
  ema: { symbol: "EMA", label: "Exponential Moving Average", hasPeriod: true },
  wma: { symbol: "WMA", label: "Weighted Moving Average", hasPeriod: true },
  hma: { symbol: "HMA", label: "Hull Moving Average", hasPeriod: true },
  dema: { symbol: "DEMA", label: "Double Exponential Moving Average", hasPeriod: true },
  tema: { symbol: "TEMA", label: "Triple Exponential Moving Average", hasPeriod: true },
  vwma: { symbol: "VWMA", label: "Volume Weighted Moving Average", hasPeriod: true },
  bb: { symbol: "BOLL", label: "Bollinger Bands", hasPeriod: true },
  envelopes: { symbol: "ENVELOPES", label: "Moving Average Envelopes", hasPeriod: true },
  supertrend: { symbol: "SUPERTREND", label: "Supertrend Indicator", hasPeriod: true },
  keltner: { symbol: "KELTNER", label: "Keltner Channels", hasPeriod: true },
  donchian: { symbol: "DONCHIAN", label: "Donchian Channels", hasPeriod: true },
  rsi: { symbol: "RSI", label: "Relative Strength Index", hasPeriod: true },
  macd: { symbol: "MACD", label: "Moving Average Convergence Divergence", hasPeriod: false },
  mfi: { symbol: "MFI", label: "Money Flow Index", hasPeriod: true },
  cmf: { symbol: "CMF", label: "Chaikin Money Flow", hasPeriod: true },
  aroon: { symbol: "AROON", label: "Aroon Indicator & Oscillator", hasPeriod: true },
  tsi: { symbol: "TSI", label: "True Strength Index", hasPeriod: false },
  ppo: { symbol: "PPO", label: "Percentage Price Oscillator", hasPeriod: false },
  cmo: { symbol: "CMO", label: "Chande Momentum Oscillator", hasPeriod: true },
  atr: { symbol: "ATR", label: "Average True Range", hasPeriod: true },
  adx: { symbol: "ADX", label: "Average Directional Index", hasPeriod: true },
};

const SIZES = { fit: "Fit screen", tall: "Tall", medium: "Medium", compact: "Compact" } as const;
type Size = keyof typeof SIZES;

const indicatorDisplayName = (i: Indicator) => {
  const meta = INDICATOR_META[i.type];
  if (!meta) return `${i.type} ${i.period}`;
  if (!meta.hasPeriod) return `${meta.symbol} (${meta.label})`;
  return `${meta.symbol} ${i.period} (${meta.label})`;
};

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
  const [modalOpen, setModalOpen] = useState(false);

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
        <span className="font-semibold text-foreground/90">Indicators:</span>
        {indicators.map((i) => (
          <span
            key={i.id}
            className="flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-xs shadow-xs"
          >
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: i.color }} />
            <span className="font-mono font-medium">{INDICATOR_META[i.type]?.symbol ?? i.type}</span>
            {INDICATOR_META[i.type]?.hasPeriod && <span className="text-muted-foreground">{i.period}</span>}
            <span className="max-w-[120px] truncate text-[11px] text-muted-foreground">
              ({INDICATOR_META[i.type]?.label ?? ""})
            </span>
            <button
              type="button"
              aria-label={`Remove ${indicatorDisplayName(i)}`}
              onClick={() => saveIndicators(indicators.filter((x) => x.id !== i.id))}
              className="ml-1 text-muted-foreground hover:text-red-500"
            >
              ✕
            </button>
          </span>
        ))}

        <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-muted/20 p-1">
          <select
            aria-label="Indicator type"
            value={draft.type}
            onChange={(e) => setDraft({ ...draft, type: e.target.value as IndicatorType })}
            className="rounded border bg-background px-2 py-1 font-medium focus:outline-none"
          >
            {(Object.keys(INDICATOR_META) as IndicatorType[]).map((t) => {
              const meta = INDICATOR_META[t];
              return (
                <option key={t} value={t}>
                  {meta.symbol} — {meta.label}
                </option>
              );
            })}
          </select>
          {INDICATOR_META[draft.type]?.hasPeriod && (
            <input
              type="number"
              min={1}
              max={500}
              aria-label="Period"
              value={draft.period}
              onChange={(e) => setDraft({ ...draft, period: Math.max(1, Number(e.target.value) || 1) })}
              className="w-16 rounded border bg-background px-1.5 py-1 focus:outline-none"
            />
          )}
          <input
            type="color"
            aria-label="Colour"
            value={draft.color}
            onChange={(e) => setDraft({ ...draft, color: e.target.value })}
            className="h-6 w-7 cursor-pointer rounded border p-0.5"
          />
          <button
            type="button"
            className="rounded bg-foreground px-2.5 py-1 text-xs font-medium text-background hover:opacity-90"
            onClick={() =>
              saveIndicators([
                ...indicators,
                { ...draft, id: `${draft.type}${draft.period}-${Date.now()}` },
              ])
            }
          >
            + Add
          </button>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded border border-dashed border-blue-500 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-500/10 dark:text-blue-400"
        >
          + Create Custom Indicator
        </button>
      </div>

      <CreateIndicatorModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          // Handled via storage event
        }}
      />

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
