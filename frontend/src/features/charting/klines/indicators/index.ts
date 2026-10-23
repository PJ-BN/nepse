import type { Kline } from "../types";
import { CUSTOM_INDICATORS } from "./custom";
import { NEPSE_INDICATORS } from "./nepse";

/** `main` indicators draw on the price pane; the rest get their own pane. `register` adds a custom one to klinecharts. */
export type IndicatorDef = { name: string; label?: string; main: boolean; register?: (k: Kline) => void };

const builtin = (main: boolean, ...names: string[]): IndicatorDef[] => names.map((name) => ({ name, main }));

export const INDICATORS: IndicatorDef[] = [
  ...builtin(true, "MA", "EMA", "SMA", "BOLL", "SAR", "BBI"),
  ...builtin(false, "VOL", "MACD", "RSI", "KDJ", "WR", "CCI", "DMI", "OBV", "ROC", "MTM", "TRIX", "AO", "BIAS", "PSY", "VR", "DMA", "EMV", "PVT", "BRAR", "CR"),
  ...CUSTOM_INDICATORS,
  ...NEPSE_INDICATORS,
];

export const isMainIndicator = (name: string) => INDICATORS.some((i) => i.name === name && i.main);

let done = false;
export function registerIndicators(k: Kline) {
  if (done) return;
  done = true;
  INDICATORS.forEach((i) => i.register?.(k));
}
