import type {
  ChartAiAnalysis,
  ChartAiArticle,
  ChartAiDrawing,
  ChartAiIndicator,
  ChartQuant,
  QuantLevel,
  QuantSignal,
} from "./types";

export type Bar = { time: number; open: number; high: number; low: number; close: number; volume: number };
type Swing = { i: number; price: number };

const r2 = (n: number) => Math.round(n * 100) / 100;
const avg = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
function last<T>(a: T[], from = 1): T {
  return a[a.length - from];
}
const dateOf = (b: Bar) => new Date(b.time * 1000).toISOString().split("T")[0];

// ---------- indicator primitives ----------

function ema(v: number[], n: number): number[] {
  const k = 2 / (n + 1);
  const out: number[] = [];
  v.forEach((x, i) => out.push(i === 0 ? x : x * k + out[i - 1] * (1 - k)));
  return out;
}

// Wilder smoothing; NaN until a full window of valid values exists.
function wilder(v: number[], n: number): number[] {
  const out = v.map(() => NaN);
  const s = v.findIndex((x) => !Number.isNaN(x));
  if (s < 0 || v.length - s < n) return out;
  out[s + n - 1] = avg(v.slice(s, s + n));
  for (let i = s + n; i < v.length; i++) out[i] = (out[i - 1] * (n - 1) + v[i]) / n;
  return out;
}

function trueRange(b: Bar[]): number[] {
  return b.map((c, i) => (i === 0 ? c.high - c.low : Math.max(c.high - c.low, Math.abs(c.high - b[i - 1].close), Math.abs(c.low - b[i - 1].close))));
}

function rsiSeries(c: number[], n = 14): number[] {
  const g: number[] = [];
  const l: number[] = [];
  for (let i = 1; i < c.length; i++) {
    const d = c[i] - c[i - 1];
    g.push(Math.max(d, 0));
    l.push(Math.max(-d, 0));
  }
  const ag = wilder(g, n);
  const al = wilder(l, n);
  return [NaN, ...ag.map((a, i) => (Number.isNaN(a) ? NaN : al[i] === 0 ? 100 : 100 - 100 / (1 + a / al[i])))];
}

function adxCalc(b: Bar[], n = 14) {
  const pdm: number[] = [];
  const mdm: number[] = [];
  for (let i = 1; i < b.length; i++) {
    const up = b[i].high - b[i - 1].high;
    const dn = b[i - 1].low - b[i].low;
    pdm.push(up > dn && up > 0 ? up : 0);
    mdm.push(dn > up && dn > 0 ? dn : 0);
  }
  const sTr = wilder(trueRange(b).slice(1), n);
  const sP = wilder(pdm, n);
  const sM = wilder(mdm, n);
  const pdi = sP.map((p, i) => (100 * p) / sTr[i]);
  const mdi = sM.map((m, i) => (100 * m) / sTr[i]);
  const dx = pdi.map((p, i) => (100 * Math.abs(p - mdi[i])) / (p + mdi[i] || 1));
  const adx = wilder(dx, n);
  return { adx: last(adx), pdi: last(pdi), mdi: last(mdi) };
}

function swings(b: Bar[], k = 3, from = 0): { highs: Swing[]; lows: Swing[] } {
  const highs: Swing[] = [];
  const lows: Swing[] = [];
  for (let i = Math.max(k, from); i < b.length - k; i++) {
    let hi = true;
    let lo = true;
    for (let j = 1; j <= k; j++) {
      if (b[i].high < b[i - j].high || b[i].high <= b[i + j].high) hi = false;
      if (b[i].low > b[i - j].low || b[i].low >= b[i + j].low) lo = false;
    }
    if (hi) highs.push({ i, price: b[i].high });
    if (lo) lows.push({ i, price: b[i].low });
  }
  return { highs, lows };
}

function aggregate(b: Bar[], keyOf: (t: number) => number): Bar[] {
  const out: Bar[] = [];
  let key = NaN;
  for (const c of b) {
    const k = keyOf(c.time);
    if (k !== key) {
      out.push({ ...c });
      key = k;
    } else {
      const a = last(out);
      a.high = Math.max(a.high, c.high);
      a.low = Math.min(a.low, c.low);
      a.close = c.close;
      a.volume += c.volume;
    }
  }
  return out;
}

function mtfTrend(b: Bar[], tf: string): ChartQuant["mtf"][number] | null {
  if (b.length < 12) return null;
  const c = b.map((x) => x.close);
  const e10 = last(ema(c, 10));
  const e20 = last(ema(c, 20));
  const px = last(c);
  const trend = px > e10 && e10 > e20 ? "UP" : px < e10 && e10 < e20 ? "DOWN" : "SIDEWAYS";
  const rsi = last(rsiSeries(c));
  return { tf, trend, rsi: r2(Number.isNaN(rsi) ? 50 : rsi), detail: `Close ${r2(px)} vs EMA10 ${r2(e10)} / EMA20 ${r2(e20)}` };
}

// ---------- engine ----------

export function computeChartQuant(bars: Bar[]): ChartQuant | null {
  if (bars.length < 30) return null;
  const b = bars;
  const n = b.length;
  const c = b.map((x) => x.close);
  const close = last(c);

  const atrArr = wilder(trueRange(b), 14);
  const atr = last(atrArr) || avg(trueRange(b).slice(-14));
  const ema20 = last(ema(c, 20));
  const sma = (p: number) => (n >= p ? avg(c.slice(-p)) : null);
  const sma50 = sma(50) ?? close;
  const sma200 = sma(200);
  const { adx, pdi, mdi } = adxCalc(b);

  // regime
  const bullStack = close > ema20 && ema20 > sma50 && (sma200 === null || sma50 > sma200);
  const bearStack = close < ema20 && ema20 < sma50 && (sma200 === null || sma50 < sma200);
  const dir = pdi >= mdi ? "UPTREND" : "DOWNTREND";
  const regimeLabel = adx >= 25 ? `STRONG ${dir}` : adx >= 18 ? `DEVELOPING ${dir}` : "RANGE / NO TREND";
  const stackTxt = bullStack
    ? `Bullish stack: price > EMA20 (${r2(ema20)}) > SMA50 (${r2(sma50)})${sma200 ? ` > SMA200 (${r2(sma200)})` : ""}`
    : bearStack
    ? `Bearish stack: price < EMA20 (${r2(ema20)}) < SMA50 (${r2(sma50)})${sma200 ? ` < SMA200 (${r2(sma200)})` : ""}`
    : `Mixed stack: EMA20 ${r2(ema20)}, SMA50 ${r2(sma50)}${sma200 ? `, SMA200 ${r2(sma200)}` : ""}`;
  const extAtr = (close - ema20) / (atr || 1);

  // swings / structure
  const win = Math.max(0, n - 250);
  const sw = swings(b, 3, win);
  const H = sw.highs;
  const L = sw.lows;
  const merged = [...H.map((s) => ({ ...s, t: "H" as const })), ...L.map((s) => ({ ...s, t: "L" as const }))].sort((x, y) => x.i - y.i);
  const labelled: string[] = [];
  const prev: Record<"H" | "L", number | null> = { H: null, L: null };
  for (const s of merged) {
    const p = prev[s.t];
    if (p !== null) labelled.push(s.t === "H" ? (s.price > p ? "HH" : "LH") : s.price > p ? "HL" : "LL");
    prev[s.t] = s.price;
  }
  const seq = labelled.slice(-4);
  const lastH = H.length ? last(H).price : null;
  const lastL = L.length ? last(L).price : null;
  const lh = [...seq].reverse().find((x) => x.endsWith("H"));
  const ll = [...seq].reverse().find((x) => x.endsWith("L"));
  const sBias = lh === "HH" && ll === "HL" ? "BULLISH" : lh === "LH" && ll === "LL" ? "BEARISH" : "RANGE";
  const lastEvent =
    lastH !== null && close > lastH
      ? `Closed above last swing high NPR ${r2(lastH)} (bullish break of structure)`
      : lastL !== null && close < lastL
      ? `Closed below last swing low NPR ${r2(lastL)} (bearish break of structure)`
      : `Inside swing range NPR ${lastL !== null ? r2(lastL) : "—"} – ${lastH !== null ? r2(lastH) : "—"}`;

  // momentum
  const rsiArr = rsiSeries(c);
  const rsi = last(rsiArr);
  const e26 = ema(c, 26);
  const macdLine = ema(c, 12).map((v, i) => v - e26[i]);
  const macdSig = ema(macdLine, 9);
  const hist = macdLine.map((v, i) => v - macdSig[i]);
  const h0 = last(hist);
  const h1 = last(hist, 2);
  const macdState =
    h0 > 0 ? (h0 >= h1 ? "Bullish & expanding" : "Bullish, fading") : h0 <= h1 ? "Bearish & expanding" : "Bearish, fading";
  const lo14 = Math.min(...b.slice(-14).map((x) => x.low));
  const hi14 = Math.max(...b.slice(-14).map((x) => x.high));
  const stochK = hi14 === lo14 ? 50 : ((close - lo14) / (hi14 - lo14)) * 100;

  let divergence = "None detected";
  const recentH = H.filter((s) => s.i >= n - 90).slice(-2);
  const recentL = L.filter((s) => s.i >= n - 90).slice(-2);
  const bearDiv = recentH.length === 2 && recentH[1].price > recentH[0].price && rsiArr[recentH[1].i] < rsiArr[recentH[0].i] - 2;
  const bullDiv = recentL.length === 2 && recentL[1].price < recentL[0].price && rsiArr[recentL[1].i] > rsiArr[recentL[0].i] + 2;
  if (bearDiv && (!bullDiv || recentH[1].i > recentL[1].i)) divergence = "Bearish RSI divergence (higher price high, lower RSI high)";
  else if (bullDiv) divergence = "Bullish RSI divergence (lower price low, higher RSI low)";

  // volatility
  const rets = c.slice(-21).map((v, i, a) => (i ? Math.log(v / a[i - 1]) : 0)).slice(1);
  const mean = avg(rets);
  const sigma = Math.sqrt(avg(rets.map((x) => (x - mean) ** 2)));
  const widths: number[] = [];
  for (let i = Math.max(19, n - 120); i < n; i++) {
    const s = c.slice(i - 19, i + 1);
    const m = avg(s);
    widths.push((4 * Math.sqrt(avg(s.map((x) => (x - m) ** 2)))) / m);
  }
  const bbPct = (widths.filter((w) => w <= last(widths)).length / widths.length) * 100;

  // volume
  const vols = b.map((x) => x.volume);
  const avgVol = avg(vols.slice(-21, -1)) || avg(vols.slice(-20));
  const relVol = avgVol ? last(vols) / avgVol : 1;
  let obv = 0;
  const obvArr = c.map((v, i) => (i === 0 ? 0 : (obv += v > c[i - 1] ? vols[i] : v < c[i - 1] ? -vols[i] : 0)));
  const obvUp = last(obvArr) > obvArr[n - 21];
  const pxUp = close > c[n - 21];
  const obvTrend =
    obvUp && pxUp ? "Accumulation (OBV rising with price)" : !obvUp && !pxUp ? "Distribution (OBV falling with price)" : obvUp ? "Bullish divergence (OBV up, price down)" : "Bearish divergence (OBV down, price up)";
  let upV = 0;
  let dnV = 0;
  for (let i = n - 20; i < n; i++) {
    if (c[i] >= c[i - 1]) upV += vols[i];
    else dnV += vols[i];
  }
  const udRatio = dnV ? upV / dnV : 3;

  // volume profile (value area)
  const vp = b.slice(-120);
  const vLo = Math.min(...vp.map((x) => x.low));
  const vHi = Math.max(...vp.map((x) => x.high));
  const bins = 24;
  const step = (vHi - vLo) / bins || 1;
  const prof = new Array<number>(bins).fill(0);
  vp.forEach((x) => (prof[Math.min(bins - 1, Math.floor(((x.high + x.low + x.close) / 3 - vLo) / step))] += x.volume));
  const total = prof.reduce((s, v) => s + v, 0);
  const poc = prof.indexOf(Math.max(...prof));
  let a = poc;
  let z = poc;
  let acc = prof[poc];
  while (acc < total * 0.7 && (a > 0 || z < bins - 1)) {
    const dn = a > 0 ? prof[a - 1] : -1;
    const up = z < bins - 1 ? prof[z + 1] : -1;
    if (up >= dn) acc += prof[++z];
    else acc += prof[--a];
  }
  const pocP = vLo + (poc + 0.5) * step;
  const vaLow = vLo + a * step;
  const vaHigh = vLo + (z + 1) * step;
  const volNote =
    close > vaHigh ? "Price accepted above value area (bullish)" : close < vaLow ? "Price below value area (bearish)" : "Price rotating inside value area (balance)";

  // support / resistance clusters
  const tol = Math.max(close * 0.012, atr * 0.6);
  const pts = [...H, ...L].map((s) => ({ p: s.price, i: s.i })).sort((x, y) => x.p - y.p);
  const clusters: Array<{ ps: number[]; is: number[] }> = [];
  for (const p of pts) {
    const cl = last(clusters);
    if (cl && p.p - avg(cl.ps) <= tol) {
      cl.ps.push(p.p);
      cl.is.push(p.i);
    } else clusters.push({ ps: [p.p], is: [p.i] });
  }
  const rangeHi = Math.max(...b.slice(-240).map((x) => x.high));
  const rangeLo = Math.min(...b.slice(-240).map((x) => x.low));
  const raw: QuantLevel[] = clusters.map((cl) => {
    const price = r2(avg(cl.ps));
    const recent = cl.is.some((i) => i >= n - 60) ? 1 : 0;
    return {
      price,
      kind: price > close ? "resistance" : "support",
      touches: cl.ps.length,
      strength: clamp(cl.ps.length + recent, 1, 5),
      distance_pct: r2(((price - close) / close) * 100),
    };
  });
  const near = raw.filter((l) => Math.abs(l.distance_pct) <= 25).sort((x, y) => Math.abs(x.distance_pct) - Math.abs(y.distance_pct));
  const levels = [
    ...near.filter((l) => l.kind === "resistance").slice(0, 4),
    ...near.filter((l) => l.kind === "support").slice(0, 4),
  ].sort((x, y) => y.price - x.price);
  const res = levels.filter((l) => l.kind === "resistance").sort((x, y) => x.price - y.price);
  const sup = levels.filter((l) => l.kind === "support").sort((x, y) => y.price - x.price);

  // fibonacci on dominant 120-bar leg
  const fb = b.slice(-120);
  const fHi = fb.reduce((m, x, i) => (x.high >= fb[m].high ? i : m), 0);
  const fLo = fb.reduce((m, x, i) => (x.low <= fb[m].low ? i : m), 0);
  const swingHi = fb[fHi].high;
  const swingLo = fb[fLo].low;
  const up = fLo < fHi;
  const leg = swingHi - swingLo;
  const fib: ChartQuant["fib"] =
    leg > atr * 2
      ? {
          direction: up ? "UP" : "DOWN",
          swing_low: r2(swingLo),
          swing_high: r2(swingHi),
          levels: [0.236, 0.382, 0.5, 0.618, 0.786].map((ratio) => ({ ratio, price: r2(up ? swingHi - ratio * leg : swingLo + ratio * leg) })),
          ext_1272: r2(up ? swingLo + 1.272 * leg : swingHi - 1.272 * leg),
          ext_1618: r2(up ? swingLo + 1.618 * leg : swingHi - 1.618 * leg),
        }
      : null;

  // candle patterns (last 3 bars)
  const patterns: ChartQuant["patterns"] = [];
  for (let i = n - 1; i >= n - 3; i--) {
    const x = b[i];
    const p = b[i - 1];
    const rng = x.high - x.low || 1e-9;
    const body = Math.abs(x.close - x.open);
    const upW = x.high - Math.max(x.open, x.close);
    const loW = Math.min(x.open, x.close) - x.low;
    const d = dateOf(x);
    if (p.close < p.open && x.close > x.open && x.open <= p.close && x.close >= p.open) patterns.push({ name: "Bullish engulfing", bias: 1, date: d });
    if (p.close > p.open && x.close < x.open && x.open >= p.close && x.close <= p.open) patterns.push({ name: "Bearish engulfing", bias: -1, date: d });
    if (body > rng * 0.1 && loW >= 2 * body && upW <= body * 0.6) patterns.push({ name: "Hammer / pin bar (rejection of lows)", bias: 1, date: d });
    if (body > rng * 0.1 && upW >= 2 * body && loW <= body * 0.6) patterns.push({ name: "Shooting star (rejection of highs)", bias: -1, date: d });
    if (body <= rng * 0.1) patterns.push({ name: "Doji (indecision)", bias: 0, date: d });
    if (x.high < p.high && x.low > p.low) patterns.push({ name: "Inside bar (compression)", bias: 0, date: d });
    if (rng > atr * 1.6 && vols[i] > avgVol * 1.5 && body > rng * 0.65)
      patterns.push({ name: x.close > x.open ? "Wide-range bullish bar on high volume" : "Wide-range bearish bar on high volume", bias: x.close > x.open ? 1 : -1, date: d });
  }

  // multi-timeframe
  const mtf = [
    mtfTrend(aggregate(b, (t) => Math.floor((t / 86400 + 4) / 7)), "Weekly"),
    mtfTrend(aggregate(b, (t) => { const d = new Date(t * 1000); return d.getUTCFullYear() * 12 + d.getUTCMonth(); }), "Monthly"),
  ].filter((x): x is NonNullable<typeof x> => x !== null);

  // confluence scorecard
  const signals: QuantSignal[] = [];
  const add = (name: string, bias: -1 | 0 | 1, weight: number, detail: string) => signals.push({ name, bias, weight, detail });
  add("Trend alignment", bullStack ? 1 : bearStack ? -1 : 0, 2, stackTxt);
  add("Trend strength (ADX/DI)", adx >= 20 ? (pdi > mdi ? 1 : -1) : 0, 1.5, `ADX ${r2(adx)}, +DI ${r2(pdi)} / -DI ${r2(mdi)}`);
  add("Market structure", sBias === "BULLISH" ? 1 : sBias === "BEARISH" ? -1 : 0, 2, `${seq.join(" → ") || "n/a"} · ${lastEvent}`);
  add("MACD momentum", h0 > 0 && h0 >= h1 ? 1 : h0 < 0 && h0 <= h1 ? -1 : 0, 1, macdState);
  add("RSI regime", rsi >= 55 && rsi < 70 ? 1 : rsi < 45 ? -1 : 0, 1, `RSI ${r2(rsi)}${rsi >= 70 ? " (overbought, momentum stretched)" : rsi <= 30 ? " (oversold)" : ""}`);
  add("Volume flow", obvUp && udRatio > 1.1 ? 1 : !obvUp && udRatio < 0.9 ? -1 : 0, 1.5, `${obvTrend}; up/down volume ${r2(udRatio)}x`);
  add("RSI divergence", divergence.startsWith("Bull") ? 1 : divergence.startsWith("Bear") ? -1 : 0, 1.5, divergence);
  add("Higher-timeframe bias", mtf.length ? clamp(mtf.reduce((s, m) => s + (m.trend === "UP" ? 1 : m.trend === "DOWN" ? -1 : 0), 0), -1, 1) as -1 | 0 | 1 : 0, 2, mtf.map((m) => `${m.tf} ${m.trend}`).join(", ") || "Insufficient history");
  add("Value area location", close > vaHigh ? 1 : close < vaLow ? -1 : 0, 1, `${volNote} (VA ${r2(vaLow)}–${r2(vaHigh)}, POC ${r2(pocP)})`);
  add("Extension from EMA20", extAtr > 3 ? -1 : extAtr < -3 ? 1 : 0, 1, `${r2(extAtr)} ATR from EMA20${Math.abs(extAtr) > 3 ? " (stretched, mean-reversion risk)" : ""}`);
  const patBias = clamp(patterns.reduce((s, p) => s + p.bias, 0), -1, 1) as -1 | 0 | 1;
  add("Candle signals", patBias, 0.5, patterns.map((p) => p.name).join("; ") || "No notable pattern");
  const wSum = signals.reduce((s, x) => s + x.weight, 0);
  const score = Math.round((signals.reduce((s, x) => s + x.bias * x.weight, 0) / wSum) * 100);

  // trade plan
  const nearestRes = res[0]?.price;
  let entryMin: number;
  let entryMax: number;
  let stop: number;
  let trigger: string;
  if (score < -15) {
    const base = nearestRes ?? close + atr;
    entryMin = base;
    entryMax = base + 0.5 * atr;
    stop = base - 1.25 * atr;
    trigger = `Downtrend/neutral bias: no entry until a daily close above NPR ${r2(base)} on relative volume ≥ 1.3×.`;
  } else {
    entryMax = Math.min(close, ema20 + 0.25 * atr);
    const s = sup.find((l) => l.price < entryMax && entryMax - l.price <= 3 * atr);
    entryMin = Math.min(Math.max(entryMax - 1.5 * atr, s ? s.price : -Infinity), entryMax - 0.5 * atr);
    stop = Math.min(entryMin, lastL !== null && lastL < entryMin ? lastL : entryMin) - 0.75 * atr;
    trigger = `Scale in across NPR ${r2(entryMin)}–${r2(entryMax)} (EMA20 / support confluence); confirm with a bullish close and relative volume ≥ 1×.`;
  }
  const mid = (entryMin + entryMax) / 2;
  const risk = Math.max(mid - stop, atr * 0.5);
  const cand = res.map((l) => l.price).filter((p) => p >= mid + risk);
  const t1 = cand[0] ?? mid + 1.5 * risk;
  const t2 = cand.find((p) => p > t1 * 1.01) ?? mid + 2.5 * risk;
  const ext = fib?.direction === "UP" ? [fib.ext_1272, fib.ext_1618].find((p) => p > t2 * 1.01) : undefined;
  const t3 = ext ?? t2 + 1.5 * risk;
  const rr = [t1, t2, t3].map((t) => r2((t - mid) / risk)) as [number, number, number];

  // scenarios
  const pBull = clamp(Math.round(33 + score * 0.3), 10, 70);
  const pBear = clamp(Math.round(33 - score * 0.3), 10, 70);
  const bullTrig = res[0] ? `Close above NPR ${res[0].price} with relative volume ≥ 1.5×` : `New high with expanding volume`;
  const scenarios: ChartQuant["scenarios"] = [
    { name: "Bull: breakout continuation", probability: pBull, target: r2(t2), trigger: bullTrig },
    { name: "Base: range / consolidation", probability: 100 - pBull - pBear, target: r2(avg([sup[0]?.price ?? close - atr, res[0]?.price ?? close + atr])), trigger: `Holds NPR ${r2(sup[0]?.price ?? close - atr)}–${r2(res[0]?.price ?? close + atr)}` },
    { name: "Bear: support failure", probability: pBear, target: r2(sup.find((l) => l.price < stop)?.price ?? close - 3 * atr), trigger: `Daily close below NPR ${r2(stop)}` },
  ];

  const sigmaPct = sigma * 100;
  return {
    last_close: r2(close),
    bars: n,
    regime: { label: regimeLabel, adx: r2(adx), plus_di: r2(pdi), minus_di: r2(mdi), ema_stack: stackTxt, ema20: r2(ema20), sma50: r2(sma50), sma200: sma200 ? r2(sma200) : null, ext_atr: r2(extAtr) },
    structure: { sequence: seq.join(" → ") || "n/a", bias: sBias, last_event: lastEvent, last_swing_high: lastH !== null ? r2(lastH) : null, last_swing_low: lastL !== null ? r2(lastL) : null },
    momentum: { rsi: r2(rsi), macd_hist: r2(h0), macd_state: macdState, stoch_k: r2(stochK), divergence },
    volatility: { atr: r2(atr), atr_pct: r2((atr / close) * 100), bb_width_pctile: Math.round(bbPct), squeeze: bbPct <= 15, hist_vol_ann: r2(sigmaPct * Math.sqrt(240)), exp_move_5d_pct: r2(sigmaPct * Math.sqrt(5)), exp_move_20d_pct: r2(sigmaPct * Math.sqrt(20)) },
    volume: { rel_vol: r2(relVol), obv_trend: obvTrend, updown_ratio: r2(udRatio), poc: r2(pocP), va_low: r2(vaLow), va_high: r2(vaHigh), note: volNote },
    levels,
    fib,
    patterns,
    mtf,
    range: { high_52w: r2(rangeHi), low_52w: r2(rangeLo), pos_pct: r2(((close - rangeLo) / (rangeHi - rangeLo || 1)) * 100), from_high_pct: r2(((close - rangeHi) / rangeHi) * 100) },
    signals,
    score,
    plan: { entry_min: r2(entryMin), entry_max: r2(entryMax), stop: r2(stop), targets: [r2(t1), r2(t2), r2(t3)], rr, risk_pct: r2(((mid - stop) / mid) * 100), shares_per_10k_risk: Math.floor(10000 / risk), trigger },
    scenarios,
  };
}

// ---------- derived outputs ----------

export function deriveCall(q: ChartQuant): Pick<ChartAiAnalysis, "stance" | "action" | "confidence_score"> {
  const brokeOut = q.structure.last_event.includes("above") && q.volume.rel_vol >= 1.3;
  const stance: ChartAiAnalysis["stance"] =
    q.score >= 55 ? "STRONG BULLISH"
    : q.score >= 25 ? (brokeOut ? "BULLISH BREAKOUT" : "BULLISH")
    : q.score > -15 ? "NEUTRAL / ACCUMULATION"
    : q.momentum.divergence.startsWith("Bull") || q.momentum.rsi < 30 ? "REVERSAL WATCH"
    : "BEARISH";
  const action: ChartAiAnalysis["action"] =
    q.score >= 25 ? (brokeOut ? "BUY BREAKOUT" : q.momentum.rsi >= 72 ? "TAKE PROFIT" : "BUY ON PULLBACK")
    : q.score > -15 ? (q.volatility.squeeze ? "BUY BREAKOUT" : "HOLD / ACCUMULATE")
    : "WAIT / AVOID";
  return { stance, action, confidence_score: Math.round(clamp(45 + Math.abs(q.score) * 0.45, 40, 90)) };
}

const L_COLOR = { res: "#dc2626", sup: "#2563eb", poc: "#a855f7", fib: "#f59e0b", up: "#16a34a" };

export function quantDrawings(bars: Bar[], q: ChartQuant): ChartAiDrawing[] {
  const out: ChartAiDrawing[] = [];
  const n = bars.length;
  const sw = swings(bars, 3, Math.max(0, n - 250));
  const ts = (i: number) => bars[i].time * 1000;

  const lows = sw.lows.slice(-2);
  if (lows.length === 2 && lows[1].price > lows[0].price)
    out.push({ name: "segment", label: "Ascending Support Trendline", points: lows.map((s) => ({ timestamp: ts(s.i), value: s.price })), color: L_COLOR.up, reason: `Rising swing lows NPR ${r2(lows[0].price)} → ${r2(lows[1].price)} define the demand trendline.` });
  const highs = sw.highs.slice(-2);
  if (highs.length === 2 && highs[1].price < highs[0].price)
    out.push({ name: "segment", label: "Descending Resistance Trendline", points: highs.map((s) => ({ timestamp: ts(s.i), value: s.price })), color: L_COLOR.res, reason: `Falling swing highs NPR ${r2(highs[0].price)} → ${r2(highs[1].price)} cap rallies.` });

  const stamp = ts(n - 1);
  const res = q.levels.filter((l) => l.kind === "resistance").sort((a, b) => a.price - b.price)[0];
  const sup = q.levels.filter((l) => l.kind === "support").sort((a, b) => b.price - a.price);
  if (res) out.push({ name: "horizontalStraightLine", label: `Resistance ${res.price} (${res.touches} touches)`, points: [{ timestamp: stamp, value: res.price }], color: L_COLOR.res, reason: `Supply cluster tested ${res.touches}× (strength ${res.strength}/5).` });
  if (sup[0]) out.push({ name: "horizontalStraightLine", label: `Support ${sup[0].price} (${sup[0].touches} touches)`, points: [{ timestamp: stamp, value: sup[0].price }], color: L_COLOR.sup, reason: `Demand cluster tested ${sup[0].touches}× (strength ${sup[0].strength}/5).` });
  out.push({ name: "horizontalStraightLine", label: `POC ${q.volume.poc} (volume point of control)`, points: [{ timestamp: stamp, value: q.volume.poc }], color: L_COLOR.poc, reason: "Price with the most traded volume over 120 bars; acts as a magnet and pivot." });
  const f618 = q.fib?.levels.find((l) => l.ratio === 0.618);
  if (f618) out.push({ name: "horizontalStraightLine", label: `Fib 61.8% (${f618.price})`, points: [{ timestamp: stamp, value: f618.price }], color: L_COLOR.fib, reason: `Golden-ratio retracement of the NPR ${q.fib!.swing_low}–${q.fib!.swing_high} leg.` });
  out.push({ name: "rect", label: "Buy Zone (plan entry band)", points: [{ timestamp: ts(Math.max(0, n - 25)), value: q.plan.entry_max }, { timestamp: stamp, value: q.plan.entry_min }], color: "#10b981", reason: `Entry band NPR ${q.plan.entry_min}–${q.plan.entry_max}, invalidated below NPR ${q.plan.stop}.` });
  return out;
}

export function quantIndicators(q: ChartQuant): ChartAiIndicator[] {
  const out: ChartAiIndicator[] = [
    { type: "ema", period: 20, color: "#3b82f6", reason: "Dynamic trend/pullback anchor used for entry placement" },
    { type: "sma", period: 50, color: "#f59e0b", reason: "Intermediate trend baseline used in the trend-alignment score" },
    { type: "bb", period: 20, color: "#94a3b8", reason: `Volatility envelope; bandwidth at ${q.volatility.bb_width_pctile}th percentile${q.volatility.squeeze ? " (squeeze)" : ""}` },
    { type: "macd", period: 12, color: "#06b6d4", reason: `Momentum phase: ${q.momentum.macd_state}` },
    { type: "rsi", period: 14, color: "#8b5cf6", reason: `Momentum/divergence gauge (RSI ${q.momentum.rsi})` },
    { type: "adx", period: 14, color: "#ec4899", reason: `Trend-strength filter (ADX ${q.regime.adx})` },
    { type: "atr", period: 14, color: "#14b8a6", reason: `Stop/target sizing (ATR NPR ${q.volatility.atr})` },
  ];
  return out;
}

export function quantNarrative(symbol: string, tf: string, q: ChartQuant): ChartAiArticle {
  const p = q.plan;
  const bull = q.score >= 25;
  const bear = q.score <= -15;
  const top = [...q.signals].sort((a, b) => Math.abs(b.bias * b.weight) - Math.abs(a.bias * a.weight)).filter((s) => s.bias !== 0).slice(0, 3);
  const res = q.levels.filter((l) => l.kind === "resistance").sort((a, b) => a.price - b.price)[0];
  const sup = q.levels.filter((l) => l.kind === "support").sort((a, b) => b.price - a.price)[0];
  return {
    executive_summary: `${symbol} (${tf}) scores ${q.score > 0 ? "+" : ""}${q.score}/100 on an 11-factor confluence model: ${bull ? "evidence favours buyers" : bear ? "evidence favours sellers" : "evidence is mixed"}. Regime: ${q.regime.label.toLowerCase()}; structure ${q.structure.bias.toLowerCase()} (${q.structure.sequence}). Strongest drivers: ${top.map((s) => `${s.name.toLowerCase()} (${s.bias > 0 ? "+" : "−"})`).join(", ") || "none dominant"}. Nearest resistance ${res ? `NPR ${res.price}` : "none (price discovery)"}, nearest support ${sup ? `NPR ${sup.price}` : "none"}.`,
    why_tools_used: `The model blends trend (EMA20/SMA50/SMA200 stack, ADX/DI), momentum (RSI, MACD, stochastic, divergence), volatility (ATR ${q.volatility.atr}, Bollinger bandwidth ${q.volatility.bb_width_pctile}th percentile) and participation (OBV, up/down volume, 120-bar volume profile). Levels are not eyeballed: swing highs/lows are clustered within ±${r2(Math.max(q.last_close * 0.012, q.volatility.atr * 0.6))} NPR so each line carries a touch count. Drawn on chart: ${q.levels.length} S/R clusters, volume POC (NPR ${q.volume.poc}), ${q.fib ? "the 61.8% Fibonacci level, " : ""}trendlines where swings confirm them, and the plan's buy zone.`,
    market_structure: `Swing sequence: ${q.structure.sequence}. ${q.structure.last_event}. ${q.structure.bias === "BULLISH" ? "Higher highs with higher lows keep the uptrend valid until the last swing low fails" : q.structure.bias === "BEARISH" ? "Lower highs with lower lows keep sellers in control until the last lower high is reclaimed" : "Mixed highs/lows signal balance or a transition; wait for a break of the range"}${q.structure.last_swing_low ? ` (invalidation: NPR ${q.structure.last_swing_low})` : ""}. Price sits at ${q.range.pos_pct}% of its 52-week range (${q.range.from_high_pct}% from the high of NPR ${q.range.high_52w}).`,
    momentum_volatility: `RSI ${q.momentum.rsi} · MACD ${q.momentum.macd_state.toLowerCase()} · Stoch %K ${q.momentum.stoch_k}. Divergence: ${q.momentum.divergence}. ADX ${q.regime.adx} (+DI ${q.regime.plus_di} / −DI ${q.regime.minus_di}) → ${q.regime.label.toLowerCase()}. Price is ${q.regime.ext_atr} ATR from the EMA20. Daily ATR is ${q.volatility.atr_pct}% of price; the 1-σ expected move is ±${q.volatility.exp_move_5d_pct}% over 5 bars and ±${q.volatility.exp_move_20d_pct}% over 20. ${q.volatility.squeeze ? "Bollinger bandwidth is in a squeeze: expect an expansion move, direction set by the break." : ""}`,
    volume_analysis: `Latest relative volume ${q.volume.rel_vol}× the 20-bar average. ${q.volume.obv_trend}; up/down volume ${q.volume.updown_ratio}×. Value area NPR ${q.volume.va_low}–${q.volume.va_high} with POC NPR ${q.volume.poc}: ${q.volume.note.toLowerCase()}.${q.patterns.length ? ` Recent candles: ${q.patterns.map((x) => `${x.name} (${x.date})`).join("; ")}.` : ""}`,
    multi_timeframe: q.mtf.length ? q.mtf.map((m) => `${m.tf}: ${m.trend} (RSI ${m.rsi}; ${m.detail})`).join(" · ") + `. ${q.mtf.every((m) => m.trend === "UP") ? "Higher timeframes agree with the trade direction, which improves odds." : q.mtf.some((m) => m.trend === "DOWN") ? "A higher-timeframe downtrend is a headwind; size down and take profits earlier." : "Higher timeframes are not fully aligned; treat breakouts with extra caution."}` : "Not enough history for higher-timeframe context.",
    what_chart_says: `${symbol} trades at NPR ${q.last_close}. ${q.regime.ema_stack}. ${q.structure.last_event}.`,
    what_to_do: `${p.trigger}
1. Entry: NPR ${p.entry_min} – ${p.entry_max}. Hard stop NPR ${p.stop} (${p.risk_pct}% risk, 0.75 ATR beyond structure).
2. Targets: T1 NPR ${p.targets[0]} (${p.rr[0]}R) – book 40%; T2 NPR ${p.targets[1]} (${p.rr[1]}R) – book 30%; T3 NPR ${p.targets[2]} (${p.rr[2]}R) – trail the rest under the EMA20.
3. Sizing: every NPR 10,000 of capital you accept losing buys about ${p.shares_per_10k_risk.toLocaleString()} shares at this stop distance. Risk 1–2% of the portfolio per idea.
4. Management: after T1 move the stop to breakeven. Exit early on a close back inside the broken range or a volume-backed reversal candle.`,
    risk_factors: [
      `Daily close below NPR ${p.stop} invalidates the setup.`,
      q.momentum.divergence !== "None detected" ? q.momentum.divergence : "No momentum divergence now; watch for one near resistance.",
      "NEPSE has a ±10% daily circuit and T+2 settlement, so gaps can skip your stop: size positions accordingly.",
      ...(q.regime.ext_atr > 2.5 ? [`Price is ${q.regime.ext_atr} ATR above the EMA20, so chasing here carries mean-reversion risk.`] : []),
    ],
  };
}
