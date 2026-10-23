import type { KLineData } from "klinecharts";
import { evaluateFormula } from "../../formula";
import { dema, ema, envelopes, hma, rsi, sma, tema, wma } from "../../indicators";
import type { Kline } from "../types";
import type { IndicatorDef } from "./index";
import { ohlcv } from "./util";

export const USER_INDICATORS_KEY = "nepse:chart:user_indicators";

export type PresetKind = "sma" | "ema" | "wma" | "hma" | "dema" | "tema" | "rsi" | "envelope" | "diff";
export type SourceKind = "close" | "open" | "high" | "low" | "hlc3" | "volume";

export type UserCustomIndicator = {
  id: string;
  name: string; // Symbol, e.g. "MY_SMA", "Z_SCORE"
  label: string; // Full name, e.g. "My 25 Simple Moving Average"
  main: boolean; // true = on price pane, false = separate pane
  type: "formula" | "preset";
  formula?: string;
  preset?: {
    kind: PresetKind;
    source: SourceKind;
    period: number;
    multiplier?: number;
  };
  color: string;
  lineWidth?: number;
  createdAt: number;
};

let cachedKline: Kline | null = null;
export function setKlinechartsModule(k: Kline) {
  cachedKline = k;
}

export function loadUserCustomIndicators(): UserCustomIndicator[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USER_INDICATORS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveUserCustomIndicator(ind: UserCustomIndicator): void {
  if (typeof window === "undefined") return;
  const current = loadUserCustomIndicators().filter((x) => x.id !== ind.id && x.name.toUpperCase() !== ind.name.toUpperCase());
  const next = [...current, ind];
  try {
    localStorage.setItem(USER_INDICATORS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("nepse:user_indicators_changed", { detail: next }));
  } catch {
    // storage error
  }

  // Register immediately if klinecharts module is loaded
  if (cachedKline) {
    const def = createIndicatorDefFromUserCustom(ind);
    def.register?.(cachedKline);
  }
}

export function deleteUserCustomIndicator(idOrName: string): void {
  if (typeof window === "undefined") return;
  const current = loadUserCustomIndicators();
  const next = current.filter((x) => x.id !== idOrName && x.name.toUpperCase() !== idOrName.toUpperCase());
  try {
    localStorage.setItem(USER_INDICATORS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("nepse:user_indicators_changed", { detail: next }));
  } catch {
    // storage error
  }
}

function getSourceSeries(bars: KLineData[], src: SourceKind): number[] {
  const { o, h, l, c, v } = ohlcv(bars);
  switch (src) {
    case "open":
      return o;
    case "high":
      return h;
    case "low":
      return l;
    case "close":
      return c;
    case "volume":
      return v;
    case "hlc3":
      return c.map((_, i) => (h[i] + l[i] + c[i]) / 3);
    default:
      return c;
  }
}

export function createIndicatorDefFromUserCustom(ind: UserCustomIndicator): IndicatorDef {
  const name = ind.name.trim().toUpperCase();
  const label = ind.label.trim() || name;

  if (ind.type === "formula" && ind.formula) {
    const formulaStr = ind.formula;
    return {
      name,
      label,
      main: ind.main,
      isCustom: true,
      register: (k) => {
        k.registerIndicator<Record<string, number>, number>({
          name,
          shortName: name,
          series: ind.main ? "price" : "normal",
          precision: 2,
          calcParams: [],
          figures: [
            {
              key: "val",
              title: `${name}: `,
              type: "line",
              styles: () => ({ color: ind.color || "#3b82f6", size: ind.lineWidth || 1 }),
            },
          ],
          calc: (d) => {
            const series = evaluateFormula(formulaStr, d);
            return d.map((_, i): Record<string, number> => {
              const v = series[i];
              return { val: v != null ? v : Number.NaN };
            });
          },
        });
      },
    };
  }

  // Preset indicator calculation
  const kind = ind.preset?.kind ?? "sma";
  const source = ind.preset?.source ?? "close";
  const period = ind.preset?.period ?? 20;
  const multiplier = ind.preset?.multiplier ?? 2;

  if (kind === "envelope") {
    return {
      name,
      label,
      main: true,
      isCustom: true,
      register: (k) => {
        k.registerIndicator<Record<string, number>, number>({
          name,
          shortName: name,
          series: "price",
          precision: 2,
          calcParams: [period, multiplier],
          figures: [
            { key: "upper", title: "Upper: ", type: "line", styles: () => ({ color: ind.color || "#3b82f6" }) },
            { key: "mid", title: "Mid: ", type: "line", styles: () => ({ color: "#f59e0b" }) },
            { key: "lower", title: "Lower: ", type: "line", styles: () => ({ color: ind.color || "#3b82f6" }) },
          ],
          calc: (d, params) => {
            const srcSeries = getSourceSeries(d, source);
            const [p, m] = params.calcParams;
            const env = envelopes(srcSeries, p, m);
            return d.map((_, i) => {
              const row: Record<string, number> = {};
              if (env.upper[i] != null) row.upper = env.upper[i]!;
              if (env.mid[i] != null) row.mid = env.mid[i]!;
              if (env.lower[i] != null) row.lower = env.lower[i]!;
              return row;
            });
          },
        });
      },
    };
  }

  return {
    name,
    label,
    main: ind.main,
    isCustom: true,
    register: (k) => {
      k.registerIndicator<Record<string, number>, number>({
        name,
        shortName: name,
        series: ind.main ? "price" : "normal",
        precision: 2,
        calcParams: [period],
        figures: [
          {
            key: "val",
            title: `${name}: `,
            type: "line",
            styles: () => ({ color: ind.color || "#3b82f6", size: ind.lineWidth || 1 }),
          },
        ],
        calc: (d, params) => {
          const srcSeries = getSourceSeries(d, source);
          const p = params.calcParams[0] || period;
          let series: (number | null)[];
          switch (kind) {
            case "ema":
              series = ema(srcSeries, p);
              break;
            case "wma":
              series = wma(srcSeries, p);
              break;
            case "hma":
              series = hma(srcSeries, p);
              break;
            case "dema":
              series = dema(srcSeries, p);
              break;
            case "tema":
              series = tema(srcSeries, p);
              break;
            case "rsi":
              series = rsi(srcSeries, p);
              break;
            case "diff": {
              const base = sma(srcSeries, p);
              series = srcSeries.map((c, i) => (base[i] != null ? c - base[i]! : null));
              break;
            }
            case "sma":
            default:
              series = sma(srcSeries, p);
              break;
          }
          return d.map((_, i): Record<string, number> => {
            const v = series[i];
            return { val: v != null ? v : Number.NaN };
          });
        },
      });
    },
  };
}
