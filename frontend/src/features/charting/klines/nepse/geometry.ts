import type { CorporateAction } from "./api";

export const dateOf = (timestamp: number) => new Date(timestamp).toISOString().slice(0, 10);

/** "B10% C5% R1:0.5": bonus, cash dividend and right share of one book closure. */
export function actionLabel(a: CorporateAction) {
  return [a.bonus_pct && `B${a.bonus_pct}%`, a.cash_pct && `C${a.cash_pct}%`, a.right_ratio && `R${a.right_ratio}`]
    .filter(Boolean)
    .join(" ");
}

/** Index of the first bar on or after `date` (the ex-date bar), or -1 when the date is past the last bar. */
export function barOnOrAfter(barDates: string[], date: string) {
  return barDates.findIndex((d) => d >= date);
}

/** Bar length in px for a volume bin, scaled so the busiest bin takes `maxPx`. */
export const profileWidth = (qty: number, maxQty: number, maxPx: number) => (maxQty ? (qty / maxQty) * maxPx : 0);
