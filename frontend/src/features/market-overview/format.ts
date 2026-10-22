const num = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export const fmt = (n: number | null | undefined) => (n == null ? "–" : num.format(n));
export const fmtPct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
export const tone = (n: number) => (n > 0 ? "text-green-600" : n < 0 ? "text-red-600" : "text-gray-500");

// Indian-style crore (1e7) for turnover figures.
export const fmtCrore = (n: number) => `Rs ${num.format(n / 1e7)} Cr`;
