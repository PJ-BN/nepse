export function num(x: number | null | undefined, digits = 2): string {
  return x == null ? "—" : x.toLocaleString("en-IN", { maximumFractionDigits: digits });
}

/** NPR amounts in crore (1 crore = 10 million), the unit Nepali filings use. */
export function crore(x: number | null | undefined): string {
  return x == null ? "—" : `${(x / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
}
