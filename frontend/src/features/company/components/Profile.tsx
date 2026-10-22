import type { CompanyFull } from "../types";
import { crore, num } from "../format";

export function Profile({ data }: { data: CompanyFull }) {
  const { profile: p, price } = data;
  return (
    <section className="rounded border p-4">
      <h1 className="text-2xl font-semibold">
        {p.name} <span className="text-gray-500">({p.symbol})</span>
      </h1>
      <p className="text-sm text-gray-600">{p.sector_code ?? "Unclassified"} · {p.instrument_type}</p>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
        <span className="text-xl font-semibold">{price.ltp == null ? "No price yet" : `Rs. ${num(price.ltp)}`}</span>
        {price.source && <span className="text-gray-500">{price.source === "live" ? "Live" : "Close"} · {price.as_of}</span>}
        <span>52W: {num(price.low_52w)} – {num(price.high_52w)}</span>
        <span>Listed shares: {num(p.listed_shares, 0)}</span>
        <span>Paid-up: {crore(p.paid_up_capital)}</span>
        {p.promoter_pct != null && (
          <span>Promoter / public: {num(p.promoter_pct)}% / {num(100 - p.promoter_pct)}%</span>
        )}
      </div>
    </section>
  );
}
