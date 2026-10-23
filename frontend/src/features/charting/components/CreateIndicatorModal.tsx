"use client";

import { useMemo, useState } from "react";
import { validateFormula } from "../formula";
import {
  saveUserCustomIndicator,
  type PresetKind,
  type SourceKind,
  type UserCustomIndicator,
} from "../klines/indicators/userCustom";

const PRESET_OPTIONS: { value: PresetKind; label: string; defaultMain: boolean }[] = [
  { value: "sma", label: "SMA (Simple Moving Average)", defaultMain: true },
  { value: "ema", label: "EMA (Exponential Moving Average)", defaultMain: true },
  { value: "wma", label: "WMA (Weighted Moving Average)", defaultMain: true },
  { value: "hma", label: "HMA (Hull Moving Average)", defaultMain: true },
  { value: "dema", label: "DEMA (Double Exponential Moving Average)", defaultMain: true },
  { value: "tema", label: "TEMA (Triple Exponential Moving Average)", defaultMain: true },
  { value: "rsi", label: "RSI (Relative Strength Index)", defaultMain: false },
  { value: "envelope", label: "Envelopes (Moving Average Bands)", defaultMain: true },
  { value: "diff", label: "Difference from SMA (Price - SMA)", defaultMain: false },
];

const SOURCE_OPTIONS: { value: SourceKind; label: string }[] = [
  { value: "close", label: "Close" },
  { value: "open", label: "Open" },
  { value: "high", label: "High" },
  { value: "low", label: "Low" },
  { value: "hlc3", label: "HLC/3 (Typical Price)" },
  { value: "volume", label: "Volume" },
];

const FORMULA_EXAMPLES = [
  {
    name: "Z-Score",
    formula: "(close - sma(close, 20)) / std(close, 20)",
    pane: false,
    sym: "Z_SCORE",
    desc: "Z-Score Price Normalization",
  },
  {
    name: "EMA Spread",
    formula: "ema(close, 9) - ema(close, 21)",
    pane: false,
    sym: "EMA_SPREAD",
    desc: "Fast/Slow EMA Spread",
  },
  {
    name: "Typical Price",
    formula: "(high + low + close) / 3",
    pane: true,
    sym: "TYPICAL",
    desc: "Typical Price (HLC/3)",
  },
  {
    name: "Stoch Position",
    formula: "(close - low) / (high - low) * 100",
    pane: false,
    sym: "STOCH_POS",
    desc: "Raw Bar Range Position %",
  },
  {
    name: "5% Target Band",
    formula: "close * 1.05",
    pane: true,
    sym: "TARGET_5",
    desc: "+5% Upper Price Band",
  },
];

export function CreateIndicatorModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (name: string, main: boolean) => void;
}) {
  const [tab, setTab] = useState<"preset" | "formula">("preset");

  // Common inputs
  const [symbol, setSymbol] = useState("MY_MA");
  const [fullName, setFullName] = useState("My Custom Moving Average");
  const [mainPane, setMainPane] = useState(true);
  const [color, setColor] = useState("#3b82f6");
  const [lineWidth, setLineWidth] = useState(2);

  // Preset tab inputs
  const [presetKind, setPresetKind] = useState<PresetKind>("ema");
  const [source, setSource] = useState<SourceKind>("close");
  const [period, setPeriod] = useState(25);
  const [multiplier, setMultiplier] = useState(2.5);

  // Formula tab inputs
  const [formula, setFormula] = useState("(close - sma(close, 20)) / std(close, 20)");

  // Live formula validation
  const validation = useMemo(() => {
    if (tab !== "formula") return { valid: true };
    return validateFormula(formula);
  }, [tab, formula]);

  if (!isOpen) return null;

  const handleSelectPreset = (kind: PresetKind) => {
    setPresetKind(kind);
    const opt = PRESET_OPTIONS.find((p) => p.value === kind);
    if (opt) {
      setMainPane(opt.defaultMain);
      setSymbol(`MY_${kind.toUpperCase()}`);
      setFullName(`Custom ${opt.label.split(" (")[0]} (${period})`);
    }
  };

  const handleApplyExample = (ex: (typeof FORMULA_EXAMPLES)[0]) => {
    setFormula(ex.formula);
    setSymbol(ex.sym);
    setFullName(ex.desc);
    setMainPane(ex.pane);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSym = symbol.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    if (!cleanSym) return;

    if (tab === "formula") {
      if (!validation.valid || !formula.trim()) return;
      const ind: UserCustomIndicator = {
        id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: cleanSym,
        label: fullName.trim() || cleanSym,
        main: mainPane,
        type: "formula",
        formula: formula.trim(),
        color,
        lineWidth,
        createdAt: Date.now(),
      };
      saveUserCustomIndicator(ind);
      onCreated(ind.name, ind.main);
      onClose();
    } else {
      const ind: UserCustomIndicator = {
        id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: cleanSym,
        label: fullName.trim() || `${cleanSym} (${period})`,
        main: mainPane,
        type: "preset",
        preset: {
          kind: presetKind,
          source,
          period,
          ...(presetKind === "envelope" ? { multiplier } : {}),
        },
        color,
        lineWidth,
        createdAt: Date.now(),
      };
      saveUserCustomIndicator(ind);
      onCreated(ind.name, ind.main);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-indicator-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-lg border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 id="create-indicator-title" className="text-sm font-semibold tracking-tight">
              Create Custom Indicator
            </h2>
            <p className="text-xs text-muted-foreground">
              Directly build and calculate your own technical indicator
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded p-1 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b text-xs">
          <button
            type="button"
            className={`flex-1 border-b-2 py-2.5 font-medium transition-colors ${
              tab === "preset"
                ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("preset")}
          >
            Standard / Parametric
          </button>
          <button
            type="button"
            className={`flex-1 border-b-2 py-2.5 font-medium transition-colors ${
              tab === "formula"
                ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("formula")}
          >
            Formula Expression (Script)
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 text-xs">
          <div className="space-y-4">
            {/* Identity: Symbol & Full Name */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="font-medium text-foreground/90">Indicator Symbol (Short Code)</span>
                <input
                  type="text"
                  required
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. MY_SMA"
                  className="rounded border bg-background px-2.5 py-1.5 font-mono uppercase focus:border-blue-500 focus:outline-none"
                />
                <span className="text-[10px] text-muted-foreground">Used on chart badges and overlays</span>
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-medium text-foreground/90">Full Name</span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. My Fast Trend 25"
                  className="rounded border bg-background px-2.5 py-1.5 focus:border-blue-500 focus:outline-none"
                />
                <span className="text-[10px] text-muted-foreground">Shown in menus and detailed tooltips</span>
              </label>
            </div>

            {/* Target pane */}
            <div className="flex flex-col gap-1">
              <span className="font-medium text-foreground/90">Chart Target Pane</span>
              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="pane"
                    checked={mainPane}
                    onChange={() => setMainPane(true)}
                  />
                  <span>On Price (Main Candlestick Pane)</span>
                </label>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="pane"
                    checked={!mainPane}
                    onChange={() => setMainPane(false)}
                  />
                  <span>Separate Pane (Oscillator / Sub-Window)</span>
                </label>
              </div>
            </div>

            {tab === "preset" ? (
              /* Preset Settings */
              <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="font-medium">Indicator Type</span>
                    <select
                      value={presetKind}
                      onChange={(e) => handleSelectPreset(e.target.value as PresetKind)}
                      className="rounded border bg-background px-2 py-1.5 focus:outline-none"
                    >
                      {PRESET_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="font-medium">Price Source</span>
                    <select
                      value={source}
                      onChange={(e) => setSource(e.target.value as SourceKind)}
                      className="rounded border bg-background px-2 py-1.5 focus:outline-none"
                    >
                      {SOURCE_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="font-medium">Period / Length</span>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={period}
                      onChange={(e) => setPeriod(Math.max(1, Number(e.target.value) || 1))}
                      className="rounded border bg-background px-2 py-1.5 focus:outline-none"
                    />
                  </label>

                  {presetKind === "envelope" && (
                    <label className="flex flex-col gap-1">
                      <span className="font-medium">Band Percentage (%)</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="50"
                        value={multiplier}
                        onChange={(e) => setMultiplier(Number(e.target.value) || 2.5)}
                        className="rounded border bg-background px-2 py-1.5 focus:outline-none"
                      />
                    </label>
                  )}
                </div>
              </div>
            ) : (
              /* Formula / Expression Settings */
              <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Math Expression / Formula</span>
                    {validation.valid ? (
                      <span className="text-[11px] font-medium text-green-600 dark:text-green-400">
                        ✓ Valid formula
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-red-600 dark:text-red-400">
                        ✕ {validation.error}
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={formula}
                    onChange={(e) => setFormula(e.target.value)}
                    placeholder="e.g. (close - sma(close, 20)) / std(close, 20)"
                    className="w-full rounded border bg-background p-2 font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Variables: <code className="font-semibold text-foreground">open, high, low, close, volume, hl2, hlc3</code> | Functions: <code className="font-semibold text-foreground">sma, ema, wma, hma, rsi, std, highest, lowest, abs, sqrt</code>
                  </span>
                </div>

                {/* Example pills */}
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground">Examples (click to load):</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {FORMULA_EXAMPLES.map((ex) => (
                      <button
                        key={ex.name}
                        type="button"
                        onClick={() => handleApplyExample(ex)}
                        className="rounded border bg-background px-2 py-1 text-[11px] hover:border-blue-500 hover:text-blue-500"
                      >
                        {ex.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Visual Styling */}
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2">
                <span className="font-medium">Line Colour:</span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-7 w-9 cursor-pointer rounded border p-0.5"
                />
              </label>

              <label className="flex items-center gap-2">
                <span className="font-medium">Width:</span>
                <select
                  value={lineWidth}
                  onChange={(e) => setLineWidth(Number(e.target.value))}
                  className="rounded border bg-background px-2 py-1"
                >
                  <option value={1}>1px</option>
                  <option value={2}>2px</option>
                  <option value={3}>3px</option>
                  <option value={4}>4px</option>
                </select>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex items-center justify-end gap-2 border-t pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded border px-3 py-1.5 text-xs hover:bg-foreground/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={tab === "formula" && !validation.valid}
              className="rounded bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Create & Add to Chart
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
