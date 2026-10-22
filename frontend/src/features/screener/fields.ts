import type { Op } from "./types";

// Mirrors application/screener/filter_ast.FIELDS on the backend (which is the authority and validates everything).
export const FIELDS = {
  symbol: { label: "Symbol", kind: "str" },
  sector: { label: "Sector", kind: "str" },
  close: { label: "Close", kind: "num" },
  change_pct: { label: "Change %", kind: "num" },
  volume: { label: "Volume", kind: "num" },
  turnover: { label: "Turnover", kind: "num" },
  market_cap: { label: "Market cap", kind: "num" },
  rsi_14: { label: "RSI 14", kind: "num" },
  sma_20: { label: "SMA 20", kind: "num" },
  sma_50: { label: "SMA 50", kind: "num" },
  sma_200: { label: "SMA 200", kind: "num" },
  atr_pct: { label: "ATR %", kind: "num" },
  high_52w: { label: "52w high", kind: "num" },
  low_52w: { label: "52w low", kind: "num" },
  top3_broker_accum_15d_pct: { label: "Top-3 broker accum 15d %", kind: "num" },
} as const;

export type FieldName = keyof typeof FIELDS;

export const NUM_OPS: Op[] = ["<", "<=", ">", ">=", "=", "!=", "between", "in"];
export const STR_OPS: Op[] = ["=", "!=", "in"];

export const opsFor = (field: FieldName): Op[] => (FIELDS[field].kind === "num" ? NUM_OPS : STR_OPS);
export const numericFields = (Object.keys(FIELDS) as FieldName[]).filter((f) => FIELDS[f].kind === "num");
