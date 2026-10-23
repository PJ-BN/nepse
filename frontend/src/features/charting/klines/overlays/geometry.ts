// Pure maths for the custom drawing tools (no klinecharts import, so it's unit-testable).
export type XY = { x: number; y: number };

export const FIB_EXTENSION = [0, 0.618, 1, 1.272, 1.618, 2, 2.618];
export const FIB_CHANNEL = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618];
export const FIB_TIME = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
export const GANN_RATIOS: [string, number][] = [["8x1", 8], ["4x1", 4], ["3x1", 3], ["2x1", 2], ["1x1", 1], ["1x2", 1 / 2], ["1x3", 1 / 3], ["1x4", 1 / 4], ["1x8", 1 / 8]];

/** Projected price at each ratio of the A→B swing, anchored at C (trend-based fib extension). */
export const fibExtension = (a: number, b: number, c: number, ratios = FIB_EXTENSION) =>
  ratios.map((r) => ({ ratio: r, value: c + (b - a) * r }));

/** Move every point of a segment by `dy` (pixels) — the fib-channel / pitchfork parallel. */
export const shiftY = (a: XY, b: XY, dy: number): [XY, XY] => [{ x: a.x, y: a.y + dy }, { x: b.x, y: b.y + dy }];

/** Point on the line a→b at the given x (vertical lines return b). */
export function atX(a: XY, b: XY, x: number): XY {
  if (b.x === a.x) return b;
  return { x, y: a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x) };
}

/** Vertical offset of `p` from the line a→b — the channel width. */
export const offsetFromLine = (a: XY, b: XY, p: XY) => p.y - atX(a, b, p.x).y;

/** Gann fan: ray from `o` towards each ratio of the 1x1 slope (o→p), `ratio` = price units per time unit relative to 1x1. */
export const gannRays = (o: XY, p: XY) => GANN_RATIOS.map(([label, r]) => ({ label, to: { x: p.x, y: o.y + (p.y - o.y) * r } }));

/** Andrews pitchfork: median line from p0 through the midpoint of p1/p2, plus the two parallel prongs. */
export function pitchfork(p0: XY, p1: XY, p2: XY) {
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  return { median: [p0, mid] as [XY, XY], upper: [p1, { x: p1.x + (mid.x - p0.x), y: p1.y + (mid.y - p0.y) }] as [XY, XY], lower: [p2, { x: p2.x + (mid.x - p0.x), y: p2.y + (mid.y - p0.y) }] as [XY, XY] };
}

/** Two short barbs for an arrow head at `to`. */
export function arrowHead(from: XY, to: XY, size = 10): [XY, XY, XY] {
  const ang = Math.atan2(to.y - from.y, to.x - from.x);
  const barb = (d: number) => ({ x: to.x - size * Math.cos(ang + d), y: to.y - size * Math.sin(ang + d) });
  return [barb(0.45), to, barb(-0.45)];
}

export function measure(a: { value: number; bars?: number }, b: { value: number; bars?: number }) {
  const price = b.value - a.value;
  return { price, pct: a.value ? (price / a.value) * 100 : 0, bars: Math.abs((b.bars ?? 0) - (a.bars ?? 0)) };
}

/** Long if target is above entry, short if below; risk/reward in price units and % of entry. */
export function position(entry: number, stop: number, target: number) {
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  const long = target >= entry;
  const valid = long ? stop < entry : stop > entry; // stop must sit on the losing side
  return { long, valid, risk, reward, rr: risk ? reward / risk : 0, riskPct: entry ? (risk / entry) * 100 : 0, rewardPct: entry ? (reward / entry) * 100 : 0 };
}

/** Retracement ratios of a harmonic XABCD pattern: AB/XA, BC/AB, CD/BC, AD/XA. */
export function harmonicRatios([x, a, b, c, d]: number[]) {
  const r = (n: number, m: number) => (m ? Math.abs(n / m) : 0);
  return { ab: r(b - a, a - x), bc: r(c - b, b - a), cd: r(d - c, c - b), ad: r(d - a, a - x) };
}
