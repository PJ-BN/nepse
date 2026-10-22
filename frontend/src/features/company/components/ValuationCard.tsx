import { DcfWidget } from "./DcfWidget";
import type { Valuation } from "../types";
import { crore, num } from "../format";

export function ValuationCard({ v, symbol }: { v: Valuation; symbol: string }) {
  const rows: [string, string][] = [
    ["EPS / BVPS", `${num(v.eps)} / ${num(v.bvps)}`],
    ["P/E · P/B", `${num(v.pe)} · ${num(v.pb)}`],
    ["Graham number", `${num(v.graham_number)}${v.graham_upside_pct != null ? ` (${num(v.graham_upside_pct, 1)}%)` : ""}`],
    ["Dividend capacity", v.dividend_capacity == null ? "—" : `${num(v.dividend_capacity * 100, 1)}% of paid-up`],
    ["Market cap", crore(v.market_cap)],
    ["Enterprise value", crore(v.enterprise_value)],
    ["EV / EBITDA", num(v.ev_ebitda)],
  ];

  if (v.price_to_life_fund != null) rows.push(["Price / adj. life fund", num(v.price_to_life_fund)]);
  if (v.nav != null) rows.push(["NAV · discount", `${num(v.nav, 4)} · ${num(v.nav_discount_pct, 1)}%`]);

  return (
    <section className="rounded border p-4">
      <h2 className="font-semibold">Valuation</h2>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {rows.map(([k, val]) => (
          <div key={k} className="contents">
            <dt className="text-gray-500">{k}</dt>
            <dd>{val}</dd>
          </div>
        ))}
      </dl>
      {v.dcf && <DcfWidget symbol={symbol} initial={v.dcf} />}
    </section>
  );
}
