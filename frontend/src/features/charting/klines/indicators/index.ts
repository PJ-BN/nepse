import type { Kline } from "../types";
import { CUSTOM_INDICATORS } from "./custom";
import { NEPSE_INDICATORS } from "./nepse";
import {
  createIndicatorDefFromUserCustom,
  loadUserCustomIndicators,
  setKlinechartsModule,
  type UserCustomIndicator,
} from "./userCustom";

/** `main` indicators draw on the price pane; the rest get their own pane. `register` adds a custom one to klinecharts. */
export type IndicatorDef = {
  name: string; // Symbol / ticker abbreviation, e.g. "SMA", "RSI"
  label: string; // Full name / descriptive title, e.g. "Simple Moving Average"
  main: boolean;
  isCustom?: boolean;
  register?: (k: Kline) => void;
};

export const BUILTIN_INDICATORS: IndicatorDef[] = [
  // Price pane built-ins
  { name: "MA", label: "Moving Average", main: true },
  { name: "EMA", label: "Exponential Moving Average", main: true },
  { name: "SMA", label: "Simple Moving Average", main: true },
  { name: "BOLL", label: "Bollinger Bands", main: true },
  { name: "SAR", label: "Parabolic Stop and Reverse", main: true },
  { name: "BBI", label: "Bull and Bear Index", main: true },

  // Separate pane built-ins
  { name: "VOL", label: "Trading Volume", main: false },
  { name: "MACD", label: "Moving Average Convergence Divergence", main: false },
  { name: "RSI", label: "Relative Strength Index", main: false },
  { name: "KDJ", label: "KDJ Stochastic Index", main: false },
  { name: "WR", label: "Williams %R", main: false },
  { name: "CCI", label: "Commodity Channel Index", main: false },
  { name: "DMI", label: "Directional Movement Index", main: false },
  { name: "OBV", label: "On-Balance Volume", main: false },
  { name: "ROC", label: "Rate of Change", main: false },
  { name: "MTM", label: "Momentum", main: false },
  { name: "TRIX", label: "Triple Exponential Average", main: false },
  { name: "AO", label: "Awesome Oscillator", main: false },
  { name: "BIAS", label: "Bias Ratio", main: false },
  { name: "PSY", label: "Psychological Line", main: false },
  { name: "VR", label: "Volatility Volume Ratio", main: false },
  { name: "DMA", label: "Different of Moving Average", main: false },
  { name: "EMV", label: "Ease of Movement Value", main: false },
  { name: "PVT", label: "Price Volume Trend", main: false },
  { name: "BRAR", label: "Sentiment Index (AR/BR)", main: false },
  { name: "CR", label: "Energy Index (CR)", main: false },
];

export const STATIC_INDICATORS: IndicatorDef[] = [
  ...BUILTIN_INDICATORS,
  ...CUSTOM_INDICATORS,
  ...NEPSE_INDICATORS,
];

// Preserves backward-compatible array export
export const INDICATORS: IndicatorDef[] = STATIC_INDICATORS;

/** Returns all indicators including user-created custom indicators. */
export function getAllIndicators(): IndicatorDef[] {
  const userCustoms = loadUserCustomIndicators().map(createIndicatorDefFromUserCustom);
  // User custom indicators take precedence if names collide
  const userMap = new Map(userCustoms.map((i) => [i.name.toUpperCase(), i]));
  const staticFiltered = STATIC_INDICATORS.filter((i) => !userMap.has(i.name.toUpperCase()));
  return [...staticFiltered, ...userCustoms];
}

/** Looks up indicator definition by symbol name. */
export function getIndicatorInfo(name: string): IndicatorDef | undefined {
  const norm = name.toUpperCase();
  return getAllIndicators().find((i) => i.name.toUpperCase() === norm);
}

export const isMainIndicator = (name: string): boolean => {
  const info = getIndicatorInfo(name);
  return info ? info.main : STATIC_INDICATORS.some((i) => i.name === name && i.main);
};

let done = false;
export function registerIndicators(k: Kline) {
  setKlinechartsModule(k);
  if (done) return;
  done = true;
  // Register static custom indicators
  STATIC_INDICATORS.forEach((i) => i.register?.(k));
  // Register saved user-created custom indicators
  loadUserCustomIndicators().forEach((u: UserCustomIndicator) => {
    createIndicatorDefFromUserCustom(u).register?.(k);
  });
}
