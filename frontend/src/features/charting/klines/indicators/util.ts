import type { KLineData } from "klinecharts";
import type { IndicatorDef } from "./index";

type Series = Record<string, (number | null)[]>;
export type Line = { key: string; title: string; color: string };

export const hlcv = (d: KLineData[]) => ({
  h: d.map((x) => x.high),
  l: d.map((x) => x.low),
  c: d.map((x) => x.close),
  v: d.map((x) => x.volume ?? 0),
});

// Nepal is UTC+5:45; bars on the same local day share a group id.
const NPT = (5 * 60 + 45) * 60_000;
const DAY = 86_400_000;
export const isIntraday = (d: KLineData[]) => d.length > 1 && d[1].timestamp - d[0].timestamp < DAY;
export const dayGroups = (d: KLineData[]) => d.map((x) => Math.floor((x.timestamp + NPT) / DAY));
export const monthGroups = (d: KLineData[]) =>
  d.map((x) => {
    const t = new Date(x.timestamp + NPT);
    return t.getUTCFullYear() * 12 + t.getUTCMonth();
  });

/** Builds an IndicatorDef from a pure calc returning one series per line key (nulls are skipped when drawing). */
export function lineIndicator(o: {
  name: string;
  label: string;
  main: boolean;
  calcParams: number[];
  lines: Line[];
  calc: (d: KLineData[], p: number[]) => Series;
}): IndicatorDef {
  return {
    name: o.name,
    label: o.label,
    main: o.main,
    register: (k) =>
      k.registerIndicator<Record<string, number>, number>({
        name: o.name,
        shortName: o.label,
        series: "price",
        precision: 2,
        calcParams: o.calcParams,
        figures: o.lines.map((l) => ({ key: l.key, title: `${l.title}: `, type: "line", styles: () => ({ color: l.color }) })),
        calc: (d, ind) => {
          const s = o.calc(d, ind.calcParams);
          return d.map((_, i) => {
            const row: Record<string, number> = {};
            for (const l of o.lines) {
              const v = s[l.key][i];
              if (v != null) row[l.key] = v;
            }
            return row;
          });
        },
      }),
  };
}
