import type { ConditionJson, OperandJson, RulesJson } from "./types";

export type Combinator = "and" | "or";

/** Indicator name -> parameter names with defaults (the server validates bounds). */
export const INDICATORS: Record<string, Record<string, number>> = {
  close: {},
  volume: {},
  sma: { n: 20 },
  ema: { n: 20 },
  rsi: { n: 14 },
  atr: { n: 14 },
  roc: { n: 10 },
  highest: { n: 20 },
  lowest: { n: 20 },
  volume_sma: { n: 20 },
  obv: {},
  "macd.line": { fast: 12, slow: 26, signal: 9 },
  "macd.signal": { fast: 12, slow: 26, signal: 9 },
  "macd.hist": { fast: 12, slow: 26, signal: 9 },
  "bollinger.mid": { n: 20, k: 2 },
  "bollinger.upper": { n: 20, k: 2 },
  "bollinger.lower": { n: 20, k: 2 },
  "stoch.k": { k: 14, d: 3 },
  "stoch.d": { k: 14, d: 3 },
  adx: { n: 14 },
  plus_di: { n: 14 },
  minus_di: { n: 14 },
};

export const OPERATORS = ["<", "<=", ">", ">=", "crosses_above", "crosses_below"] as const;
export type Operator = (typeof OPERATORS)[number];

export type IndOperand = { kind: "ind"; ind: string; params: Record<string, string> };
export type NumOperand = { kind: "num"; value: string };
export type Operand = IndOperand | NumOperand;
export type Row = { id: string; left: IndOperand; op: Operator; right: Operand };

let seq = 0;

export const newIndicator = (ind: string): IndOperand => ({
  kind: "ind",
  ind,
  params: Object.fromEntries(Object.entries(INDICATORS[ind] ?? {}).map(([k, v]) => [k, String(v)])),
});

export const newRow = (over: Partial<Row> = {}): Row => ({
  id: `r${seq++}`,
  left: newIndicator("rsi"),
  op: "<",
  right: { kind: "num", value: "30" },
  ...over,
});

const num = (s: string): number | null => (s.trim() === "" || Number.isNaN(Number(s)) ? null : Number(s));

export function operandToJson(o: Operand): OperandJson | null {
  if (o.kind === "num") return num(o.value);
  const out: { ind: string; [k: string]: string | number } = { ind: o.ind };
  for (const [k, v] of Object.entries(o.params)) {
    const n = num(v);
    if (n === null) return null;
    out[k] = n;
  }
  return out;
}

export function rowToCondition(r: Row): ConditionJson | null {
  const left = operandToJson(r.left);
  const right = operandToJson(r.right);
  return left === null || right === null ? null : { left, op: r.op, right };
}

/** Incomplete rows are dropped; null when nothing usable is left. */
export function rowsToRules(rows: Row[], kind: Combinator): RulesJson | null {
  const conds = rows.flatMap((r) => rowToCondition(r) ?? []);
  if (conds.length === 0) return null;
  return kind === "and" ? { and: conds } : { or: conds };
}

const HORIZON_MAX = 250;

/** "5, 10, 20" -> [5, 10, 20]; sorted, de-duplicated, null when any token is not a positive integer. */
export function parseHorizons(text: string): number[] | null {
  const nums = text.split(",").map((s) => s.trim()).filter(Boolean).map(Number);
  if (nums.length === 0 || nums.some((n) => !Number.isInteger(n) || n < 1 || n > HORIZON_MAX)) return null;
  return [...new Set(nums)].sort((a, b) => a - b);
}
