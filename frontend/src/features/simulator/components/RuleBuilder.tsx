"use client";

import { type Combinator, INDICATORS, newIndicator, newRow, OPERATORS, type IndOperand, type Operand, type Operator, type Row } from "../rules";

const INPUT = "rounded border bg-transparent px-2 py-1";

const INDICATOR_TITLES: Record<string, string> = {
  open: "Open Price",
  high: "High Price",
  low: "Low Price",
  close: "Close Price",
  volume: "Volume",
  sma: "SMA (Simple Moving Average)",
  ema: "EMA (Exponential Moving Average)",
  rsi: "RSI (Relative Strength Index)",
  atr: "ATR (Average True Range)",
  roc: "ROC (Rate of Change)",
  highest: "Highest High",
  lowest: "Lowest Low",
  volume_sma: "Volume SMA",
  obv: "OBV (On-Balance Volume)",
  "macd.line": "MACD Line",
  "macd.signal": "MACD Signal",
  "macd.hist": "MACD Histogram",
  "bb.mid": "Bollinger Middle Band",
  "bb.upper": "Bollinger Upper Band",
  "bb.lower": "Bollinger Lower Band",
  "stoch.k": "Stochastic %K",
  "stoch.d": "Stochastic %D",
  "adx.adx": "ADX (Average Directional Index)",
  "adx.plus_di": "+DI (Positive Directional Index)",
  "adx.minus_di": "-DI (Negative Directional Index)",
};

function IndicatorPicker({ value, onChange }: { value: IndOperand; onChange: (o: IndOperand) => void }) {
  return (
    <span className="inline-flex items-center gap-1">
      <select aria-label="Indicator" value={value.ind} onChange={(e) => onChange(newIndicator(e.target.value))} className={INPUT}>
        {Object.keys(INDICATORS).map((k) => (
          <option key={k} value={k}>
            {k.toUpperCase()} — {INDICATOR_TITLES[k] ?? k}
          </option>
        ))}
      </select>
      {Object.keys(value.params).map((p) => (
        <label key={p} className="inline-flex items-center gap-1 text-xs text-gray-500">
          {p}
          <input
            value={value.params[p]}
            onChange={(e) => onChange({ ...value, params: { ...value.params, [p]: e.target.value } })}
            inputMode="decimal"
            className={`${INPUT} w-14 text-sm text-foreground`}
          />
        </label>
      ))}
    </span>
  );
}

function RightSide({ value, onChange }: { value: Operand; onChange: (o: Operand) => void }) {
  return (
    <span className="inline-flex items-center gap-1">
      <select
        aria-label="Right side kind"
        value={value.kind}
        onChange={(e) => onChange(e.target.value === "num" ? { kind: "num", value: "" } : newIndicator("sma"))}
        className={INPUT}
      >
        <option value="num">number</option>
        <option value="ind">indicator</option>
      </select>
      {value.kind === "num" ? (
        <input aria-label="Value" value={value.value} onChange={(e) => onChange({ kind: "num", value: e.target.value })} inputMode="decimal" className={`${INPUT} w-20`} />
      ) : (
        <IndicatorPicker value={value} onChange={onChange} />
      )}
    </span>
  );
}

export function RuleBuilder({
  rows,
  combinator,
  onChange,
}: {
  rows: Row[];
  combinator: Combinator;
  onChange: (rows: Row[], combinator: Combinator) => void;
}) {
  const set = (id: string, patch: Partial<Row>) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)), combinator);
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <span>Signal fires when</span>
        <div role="group" aria-label="Combinator" className="flex overflow-hidden rounded border text-xs">
          {(["and", "or"] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={combinator === c}
              onClick={() => onChange(rows, c)}
              className={`px-3 py-1 ${combinator === c ? "bg-foreground text-background" : ""}`}
            >
              {c === "and" ? "ALL" : "ANY"}
            </button>
          ))}
        </div>
        <span>of these hold:</span>
      </div>
      {rows.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-2">
          <IndicatorPicker value={r.left} onChange={(left) => set(r.id, { left })} />
          <select aria-label="Operator" value={r.op} onChange={(e) => set(r.id, { op: e.target.value as Operator })} className={INPUT}>
            {OPERATORS.map((o) => (
              <option key={o} value={o}>{o.replace("_", " ")}</option>
            ))}
          </select>
          <RightSide value={r.right} onChange={(right) => set(r.id, { right })} />
          <button
            type="button"
            aria-label="Remove condition"
            onClick={() => onChange(rows.filter((x) => x.id !== r.id), combinator)}
            className="rounded border px-2 py-1 text-gray-500 hover:bg-gray-100"
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, newRow()], combinator)} className="rounded border px-3 py-1 hover:bg-gray-100">
        + Add condition
      </button>
    </div>
  );
}
