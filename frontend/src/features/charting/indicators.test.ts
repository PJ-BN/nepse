import { describe, expect, it } from "vitest";
import {
  adx,
  aroon,
  atr,
  bbw,
  bollinger,
  cmf,
  cmo,
  dema,
  donchian,
  ema,
  envelopes,
  histVol,
  hma,
  ichimoku,
  keltner,
  macd,
  mfi,
  pivots,
  ppo,
  rvi,
  stochastic,
  stochRsi,
  supertrend,
  tema,
  tsi,
  vwap,
  vwma,
  wma,
} from "./indicators";

describe("indicators", () => {
  it("ema seeds with sma then smooths", () => {
    const e = ema([1, 2, 3, 4, 5], 3);
    expect(e.slice(0, 2)).toEqual([null, null]);
    expect(e[2]).toBe(2);
    expect(e[3]).toBe(3); // 4*0.5 + 2*0.5
  });
  it("macd histogram = line - signal, null until warmed up", () => {
    const v = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 3) * 5);
    const m = macd(v);
    expect(m.line[24]).toBeNull();
    expect(m.line[25]).not.toBeNull();
    expect(m.signal[32]).toBeNull();
    expect(m.hist[59]).toBeCloseTo(m.line[59]! - m.signal[59]!);
  });
  it("bollinger bands are symmetric around the mean", () => {
    const b = bollinger([1, 2, 3, 4, 5], 5, 2);
    expect(b.mid[4]).toBe(3);
    expect(b.upper[4]! - 3).toBeCloseTo(3 - b.lower[4]!);
  });
});

describe("custom indicators", () => {
  const h = [48.7, 48.72, 48.9, 48.87, 48.82, 49.05, 49.2, 49.35, 49.92, 50.19, 50.12, 49.66, 49.88, 50.19, 50.36, 50.57];
  const l = [47.79, 48.14, 48.39, 48.37, 48.24, 48.64, 48.94, 48.86, 49.5, 49.87, 49.2, 48.9, 49.43, 49.73, 49.26, 50.09];
  const c = [48.16, 48.61, 48.75, 48.63, 48.74, 49.03, 49.07, 49.32, 49.91, 50.13, 49.53, 49.5, 49.75, 50.03, 50.31, 50.52];

  it("atr is Wilder-smoothed true range", () => {
    const a = atr(h, l, c, 14);
    expect(a[12]).toBeNull();
    const tr = h.map((x, i) => (i === 0 ? x - l[i] : Math.max(x - l[i], Math.abs(x - c[i - 1]), Math.abs(l[i] - c[i - 1]))));
    expect(a[13]).toBeCloseTo(tr.slice(0, 14).reduce((s, x) => s + x, 0) / 14, 9);
    expect(a[14]).toBeCloseTo((a[13]! * 13 + tr[14]) / 14, 9);
  });
  it("stochastic %K is position in the window range", () => {
    const s = stochastic([2, 4, 6], [0, 2, 1], [1, 3, 5], 3, 1, 1);
    expect(s.k[1]).toBeNull();
    expect(s.k[2]).toBeCloseTo((100 * (5 - 0)) / (6 - 0));
  });
  it("donchian is rolling max/min", () => {
    const d = donchian([1, 5, 3, 2], [0, 4, 1, 1], 3);
    expect(d.upper).toEqual([null, null, 5, 5]);
    expect(d.lower).toEqual([null, null, 0, 1]);
    expect(d.mid[3]).toBe(3);
  });
  it("keltner brackets the ema by mult*atr", () => {
    const k = keltner(h, l, c, 5, 2, 5);
    const a = atr(h, l, c, 5);
    expect(k.upper[10]! - k.mid[10]!).toBeCloseTo(2 * a[10]!);
    expect(k.mid[10]! - k.lower[10]!).toBeCloseTo(2 * a[10]!);
  });
  it("adx is high in a steady trend and DI+ beats DI-", () => {
    const up = Array.from({ length: 60 }, (_, i) => 100 + i);
    const r = adx(up.map((x) => x + 1), up.map((x) => x - 1), up, 14);
    expect(r.plus[59]!).toBeGreaterThan(r.minus[59]!);
    expect(r.adx[59]!).toBeGreaterThan(90);
  });
  it("stochRsi stays within 0..100 and is null during warm-up", () => {
    const v = Array.from({ length: 80 }, (_, i) => 100 + Math.sin(i / 4) * 10);
    const s = stochRsi(v);
    expect(s.k[20]).toBeNull();
    s.k.concat(s.d).forEach((x) => {
      if (x !== null) {
        expect(x).toBeGreaterThanOrEqual(-1e-9);
        expect(x).toBeLessThanOrEqual(100 + 1e-9);
      }
    });
  });
  it("supertrend flips to downtrend after a crash and sits above price", () => {
    const px = [...Array.from({ length: 30 }, (_, i) => 100 + i), ...Array.from({ length: 15 }, (_, i) => 129 - i * 5)];
    const st = supertrend(px.map((x) => x + 1), px.map((x) => x - 1), px, 10, 3);
    expect(st.dir[29]).toBe(1);
    expect(st.line[29]!).toBeLessThan(px[29]);
    expect(st.dir[44]).toBe(-1);
    expect(st.line[44]!).toBeGreaterThan(px[44]);
  });
  it("ichimoku tenkan/kijun are window midpoints; spans are displaced", () => {
    const hh = Array.from({ length: 80 }, (_, i) => 10 + i);
    const ll = hh.map((x) => x - 2);
    const r = ichimoku(hh, ll, hh);
    expect(r.tenkan[8]).toBe((hh[8] + ll[0]) / 2);
    expect(r.spanA[26 + 25]).toBe((r.tenkan[25]! + r.kijun[25]!) / 2);
    expect(r.spanB[26 + 51]).toBe((hh[51] + ll[0]) / 2);
    expect(r.chikou[0]).toBe(hh[26]);
    expect(r.chikou[79]).toBeNull();
  });
  it("vwap weights by volume and restarts per group", () => {
    const v = vwap([10, 20, 30], [10, 20, 30], [10, 20, 30], [1, 3, 5]);
    expect(v[1]).toBe((10 + 60) / 4);
    expect(vwap([10, 20, 30], [10, 20, 30], [10, 20, 30], [1, 3, 5], [0, 0, 1])[2]).toBe(30);
  });
  it("pivots use the previous group's HLC", () => {
    const r = pivots([12, 10, 11], [8, 9, 10], [10, 9.5, 10.5], [0, 0, 1]);
    expect(r.p[0]).toBeNull();
    expect(r.p[2]).toBeCloseTo((12 + 8 + 9.5) / 3);
    expect(r.r1[2]).toBeCloseTo(2 * r.p[2]! - 8);
    expect(r.s2[2]).toBeCloseTo(r.p[2]! - 4);
  });

  it("wma gives greater weight to recent prices", () => {
    const vals = [10, 20, 30];
    const res = wma(vals, 3);
    // (10*1 + 20*2 + 30*3) / (1+2+3) = (10 + 40 + 90) / 6 = 140 / 6 = 23.333...
    expect(res[0]).toBeNull();
    expect(res[1]).toBeNull();
    expect(res[2]).toBeCloseTo(140 / 6);
  });

  it("hma produces responsive smoothing", () => {
    const vals = Array.from({ length: 30 }, (_, i) => 100 + i * 2);
    const res = hma(vals, 9);
    expect(res[29]).not.toBeNull();
    expect(res[29]!).toBeGreaterThan(100);
  });

  it("dema and tema reduce lag relative to plain ema", () => {
    const vals = Array.from({ length: 40 }, (_, i) => 50 + i * 5);
    const d = dema(vals, 10);
    const t = tema(vals, 10);
    expect(d[39]).not.toBeNull();
    expect(t[39]).not.toBeNull();
    expect(t[39]!).toBeGreaterThanOrEqual(vals[35]);
  });

  it("vwma weights prices by volume", () => {
    const c = [10, 20];
    const v = [100, 300];
    const res = vwma(c, v, 2);
    // (10*100 + 20*300) / (100+300) = (1000 + 6000) / 400 = 17.5
    expect(res[0]).toBeNull();
    expect(res[1]).toBe(17.5);
  });

  it("mfi stays bounded between 0 and 100", () => {
    const h = [10, 12, 14, 16, 15, 17, 19, 21, 20, 22, 24, 26, 25, 27, 29, 31];
    const l = [8, 10, 12, 14, 13, 15, 17, 19, 18, 20, 22, 24, 23, 25, 27, 29];
    const c = [9, 11, 13, 15, 14, 16, 18, 20, 19, 21, 23, 25, 24, 26, 28, 30];
    const v = [100, 150, 120, 200, 180, 250, 210, 300, 190, 280, 320, 400, 220, 350, 380, 420];
    const res = mfi(h, l, c, v, 14);
    expect(res[13]).toBeNull();
    expect(res[14]).not.toBeNull();
    expect(res[14]!).toBeGreaterThanOrEqual(0);
    expect(res[14]!).toBeLessThanOrEqual(100);
  });

  it("cmf calculates money flow volume ratio", () => {
    const h = Array.from({ length: 30 }, () => 100);
    const l = Array.from({ length: 30 }, () => 90);
    const c = Array.from({ length: 30 }, () => 95); // exactly mid -> MFV = 0
    const v = Array.from({ length: 30 }, () => 1000);
    const res = cmf(h, l, c, v, 20);
    expect(res[19]).toBe(0);
  });

  it("aroon calculates up, down and oscillator", () => {
    const upSeries = Array.from({ length: 30 }, (_, i) => 100 + i);
    const res = aroon(upSeries, upSeries.map((x) => x - 2), 14);
    expect(res.up[29]).toBe(100); // newest bar is the high
    expect(res.down[29]).toBe(0); // lowest bar was 14 bars ago
    expect(res.osc[29]).toBe(100);
  });

  it("rvi calculates vigor and signal", () => {
    const o = Array.from({ length: 30 }, (_, i) => 100 + i);
    const h = o.map((x) => x + 2);
    const l = o.map((x) => x - 1);
    const c = o.map((x) => x + 1);
    const res = rvi(o, h, l, c, 14);
    expect(res.rvi[20]).not.toBeNull();
    expect(res.signal[20]).not.toBeNull();
  });

  it("tsi and ppo oscillate around zero", () => {
    const c = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 3) * 10);
    const t = tsi(c, 10, 5, 5);
    const p = ppo(c, 12, 26, 9);
    expect(t.tsi[49]).not.toBeNull();
    expect(p.ppo[49]).not.toBeNull();
    expect(p.hist[49]).not.toBeNull();
  });

  it("cmo bounded between -100 and +100", () => {
    const c = Array.from({ length: 30 }, (_, i) => 100 + i * 2);
    const res = cmo(c, 14);
    expect(res[14]).toBe(100); // pure gains
  });

  it("histVol measures volatility percentage", () => {
    const c = Array.from({ length: 30 }, (_, i) => 100 + (i % 2 === 0 ? 5 : -5));
    const res = histVol(c, 14);
    expect(res[14]).not.toBeNull();
    expect(res[14]!).toBeGreaterThan(0);
  });

  it("envelopes and bbw bracket price", () => {
    const c = Array.from({ length: 30 }, () => 100);
    const env = envelopes(c, 20, 5);
    expect(env.mid[25]).toBe(100);
    expect(env.upper[25]).toBe(105);
    expect(env.lower[25]).toBe(95);

    const b = bbw(c, 20, 2);
    expect(b.width[25]).toBe(0); // variance is 0
  });
});
