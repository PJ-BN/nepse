// Indicator values aligned with the input; null where there is not enough history yet.

export function sma(values: number[], period: number): (number | null)[] {
  let sum = 0;
  return values.map((v, i) => {
    sum += v - (i >= period ? values[i - period] : 0);
    return i >= period - 1 ? sum / period : null;
  });
}

// Wilder's RSI.
export function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = values.map(() => null);
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    const g = Math.max(d, 0);
    const l = Math.max(-d, 0);
    if (i <= period) {
      gain += g / period;
      loss += l / period;
    } else {
      gain = (gain * (period - 1) + g) / period;
      loss = (loss * (period - 1) + l) / period;
    }
    if (i >= period) out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const out: (number | null)[] = values.map(() => null);
  let prev = 0;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) prev += values[i];
    else if (i === period - 1) out[i] = prev = (prev + values[i]) / period; // seed with the SMA
    else out[i] = prev = values[i] * k + prev * (1 - k);
  }
  return out;
}

export function macd(values: number[], fast = 12, slow = 26, signal = 9) {
  const f = ema(values, fast);
  const s = ema(values, slow);
  const line = values.map((_, i) => (f[i] === null || s[i] === null ? null : f[i]! - s[i]!));
  const start = line.findIndex((v) => v !== null);
  const sig: (number | null)[] = line.map(() => null);
  if (start >= 0) ema(line.slice(start) as number[], signal).forEach((v, i) => (sig[start + i] = v));
  const hist = line.map((v, i) => (v === null || sig[i] === null ? null : v - sig[i]!));
  return { line, signal: sig, hist };
}

export function bollinger(values: number[], period = 20, mult = 2) {
  const mid = sma(values, period);
  const sd = values.map((_, i) => {
    if (i < period - 1) return null;
    const m = mid[i]!;
    let sq = 0;
    for (let j = i - period + 1; j <= i; j++) sq += (values[j] - m) ** 2;
    return Math.sqrt(sq / period);
  });
  return {
    mid,
    upper: mid.map((m, i) => (m === null ? null : m + mult * sd[i]!)),
    lower: mid.map((m, i) => (m === null ? null : m - mult * sd[i]!)),
  };
}

type N = number | null;

const rollMax = (v: number[], p: number): N[] => v.map((_, i) => (i < p - 1 ? null : Math.max(...v.slice(i - p + 1, i + 1))));
const rollMin = (v: number[], p: number): N[] => v.map((_, i) => (i < p - 1 ? null : Math.min(...v.slice(i - p + 1, i + 1))));

// Wilder smoothing (RMA) of a series that may start with nulls; seeded with the first `period` values' mean.
function wilder(values: N[], period: number): N[] {
  const out: N[] = values.map(() => null);
  const start = values.findIndex((v) => v !== null);
  if (start < 0) return out;
  let prev = 0;
  for (let i = start; i < values.length; i++) {
    const n = i - start;
    if (n < period - 1) prev += values[i]!;
    else if (n === period - 1) out[i] = prev = (prev + values[i]!) / period;
    else out[i] = prev = (prev * (period - 1) + values[i]!) / period;
  }
  return out;
}

const trueRange = (h: number[], l: number[], c: number[]) => h.map((_, i) => (i === 0 ? h[i] - l[i] : Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1]))));

export const atr = (h: number[], l: number[], c: number[], period = 14): N[] => wilder(trueRange(h, l, c), period);

export function adx(h: number[], l: number[], c: number[], period = 14) {
  const tr = trueRange(h, l, c);
  const pdm = h.map((_, i) => (i === 0 ? 0 : h[i] - h[i - 1] > l[i - 1] - l[i] && h[i] - h[i - 1] > 0 ? h[i] - h[i - 1] : 0));
  const mdm = h.map((_, i) => (i === 0 ? 0 : l[i - 1] - l[i] > h[i] - h[i - 1] && l[i - 1] - l[i] > 0 ? l[i - 1] - l[i] : 0));
  const sTr = wilder(tr, period);
  const sP = wilder(pdm, period);
  const sM = wilder(mdm, period);
  const plus = sTr.map((t, i) => (t ? (100 * sP[i]!) / t : null));
  const minus = sTr.map((t, i) => (t ? (100 * sM[i]!) / t : null));
  const dx = plus.map((p, i) => (p === null ? null : p + minus[i]! === 0 ? 0 : (100 * Math.abs(p - minus[i]!)) / (p + minus[i]!)));
  return { adx: wilder(dx, period), plus, minus };
}

// SMA over a series that may start with nulls.
function smaN(values: N[], period: number): N[] {
  const start = values.findIndex((v) => v !== null);
  const out: N[] = values.map(() => null);
  if (start >= 0) sma(values.slice(start) as number[], period).forEach((v, i) => (out[start + i] = v));
  return out;
}

const rawStoch = (v: number[], hh: N[], ll: N[]): N[] => v.map((x, i) => (hh[i] === null ? null : hh[i] === ll[i] ? 50 : (100 * (x - ll[i]!)) / (hh[i]! - ll[i]!)));

// Slow stochastic: %K = SMA(raw %K, smooth), %D = SMA(%K, dPeriod).
export function stochastic(h: number[], l: number[], c: number[], period = 14, smooth = 3, dPeriod = 3) {
  const k = smaN(rawStoch(c, rollMax(h, period), rollMin(l, period)), smooth);
  return { k, d: smaN(k, dPeriod) };
}

export function stochRsi(values: number[], rsiPeriod = 14, period = 14, kSmooth = 3, dSmooth = 3) {
  const r = rsi(values, rsiPeriod);
  const start = r.findIndex((v) => v !== null);
  const raw: N[] = values.map(() => null);
  if (start >= 0) {
    const rr = r.slice(start) as number[];
    rawStoch(rr, rollMax(rr, period), rollMin(rr, period)).forEach((v, i) => (raw[start + i] = v));
  }
  const k = smaN(raw, kSmooth);
  return { k, d: smaN(k, dSmooth) };
}

export function keltner(h: number[], l: number[], c: number[], period = 20, mult = 2, atrPeriod = 10) {
  const mid = ema(c, period);
  const a = atr(h, l, c, atrPeriod);
  return {
    mid,
    upper: mid.map((m, i) => (m === null || a[i] === null ? null : m + mult * a[i]!)),
    lower: mid.map((m, i) => (m === null || a[i] === null ? null : m - mult * a[i]!)),
  };
}

export function donchian(h: number[], l: number[], period = 20) {
  const upper = rollMax(h, period);
  const lower = rollMin(l, period);
  return { upper, lower, mid: upper.map((u, i) => (u === null ? null : (u + lower[i]!) / 2)) };
}

// dir: 1 = uptrend (line is the lower band), -1 = downtrend (upper band).
export function supertrend(h: number[], l: number[], c: number[], period = 10, mult = 3) {
  const a = atr(h, l, c, period);
  const line: N[] = c.map(() => null);
  const dir: number[] = c.map(() => 1);
  let up = 0; // final lower band
  let dn = 0; // final upper band
  for (let i = 0; i < c.length; i++) {
    if (a[i] === null) continue;
    const mid = (h[i] + l[i]) / 2;
    let u = mid + mult * a[i]!;
    let d = mid - mult * a[i]!;
    if (line[i - 1] != null) {
      if (!(u < dn || c[i - 1] > dn)) u = dn; // bands only ratchet toward price until it closes through them
      if (!(d > up || c[i - 1] < up)) d = up;
      dir[i] = dir[i - 1] === 1 ? (c[i] < d ? -1 : 1) : c[i] > u ? 1 : -1;
    }
    dn = u;
    up = d;
    line[i] = dir[i] === 1 ? d : u;
  }
  return { line, dir };
}

// Spans are shifted forward by `shift` bars and chikou back, within the available data (no future bars to draw on).
export function ichimoku(h: number[], l: number[], c: number[], conv = 9, base = 26, spanB = 52, shift = 26) {
  const mid = (p: number) => {
    const hh = rollMax(h, p);
    const ll = rollMin(l, p);
    return hh.map((x, i) => (x === null ? null : (x + ll[i]!) / 2));
  };
  const tenkan = mid(conv);
  const kijun = mid(base);
  const sb = mid(spanB);
  const sa = tenkan.map((t, i) => (t === null || kijun[i] === null ? null : (t + kijun[i]!) / 2));
  return {
    tenkan,
    kijun,
    spanA: c.map((_, i) => (i >= shift ? sa[i - shift] : null)),
    spanB: c.map((_, i) => (i >= shift ? sb[i - shift] : null)),
    chikou: c.map((_, i) => (i + shift < c.length ? c[i + shift] : null)),
  };
}

/** Cumulative volume-weighted typical price; `groups` (e.g. a day id per bar) restarts the sum when it changes. */
export function vwap(h: number[], l: number[], c: number[], v: number[], groups?: number[]): N[] {
  let pv = 0;
  let vol = 0;
  return c.map((_, i) => {
    if (i > 0 && groups && groups[i] !== groups[i - 1]) pv = vol = 0;
    pv += ((h[i] + l[i] + c[i]) / 3) * v[i];
    vol += v[i];
    return vol ? pv / vol : (h[i] + l[i] + c[i]) / 3;
  });
}

/** Classic pivots from the previous group's high/low/close; `groups` is a period id per bar (day, month, ...). */
export function pivots(h: number[], l: number[], c: number[], groups: number[]) {
  const out = { p: [] as N[], r1: [] as N[], r2: [] as N[], s1: [] as N[], s2: [] as N[] };
  let prev: { h: number; l: number; c: number } | null = null;
  let cur = { h: -Infinity, l: Infinity, c: 0 };
  for (let i = 0; i < c.length; i++) {
    if (i > 0 && groups[i] !== groups[i - 1]) {
      prev = cur;
      cur = { h: -Infinity, l: Infinity, c: 0 };
    }
    cur = { h: Math.max(cur.h, h[i]), l: Math.min(cur.l, l[i]), c: c[i] };
    const p = prev && (prev.h + prev.l + prev.c) / 3;
    const range = prev ? prev.h - prev.l : 0;
    out.p.push(p);
    out.r1.push(prev && 2 * p! - prev.l);
    out.r2.push(prev && p! + range);
    out.s1.push(prev && 2 * p! - prev.h);
    out.s2.push(prev && p! - range);
  }
  return out;
}
