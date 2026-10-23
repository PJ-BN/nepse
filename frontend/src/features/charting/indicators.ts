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
