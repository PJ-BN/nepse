"use client";

import { useCompanyFull, useRefreshCompany } from "../hooks/useCompany";
import { num } from "../format";
import { DepthPanel } from "./DepthPanel";
import { FinancialsTable } from "./FinancialsTable";
import { LockinBadge } from "./LockinBadge";
import { Profile } from "./Profile";
import { SectorFlags } from "./SectorFlags";
import { ValuationCard } from "./ValuationCard";
import { AiFundamentalCard } from "./AiFundamentalCard";

export function CompanyPage({ symbol }: { symbol: string }) {
  const { data, error, isLoading } = useCompanyFull(symbol);
  const refresh = useRefreshCompany(symbol);

  const refreshButton = (
    <button
      className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-muted/30 disabled:opacity-50 transition-colors"
      onClick={() => refresh.mutate()}
      disabled={refresh.isPending}
      title="Dev only: scrape MeroLagani / NepaliPaisa now"
    >
      {refresh.isPending ? "Refreshing…" : "Refresh fundamentals"}
    </button>
  );

  if (isLoading) return <main className="p-8">Loading {symbol}…</main>;
  if (!data)
    return (
      <main className="space-y-4 p-8 max-w-[1440px] mx-auto">
        <p className="text-sm font-medium">{error ? `Could not load ${symbol}: ${error.message}` : `No data for ${symbol}.`}</p>
        {refreshButton}
        {refresh.error && <p className="text-sm text-red-700">{refresh.error.message}</p>}
      </main>
    );

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      <Profile data={data} />
      <div className="flex flex-wrap items-center gap-3">
        <LockinBadge daysLeft={data.lockin.days_left} expiry={data.lockin.expiry} />
        {refreshButton}
        {refresh.error && <span className="text-sm text-red-700">{refresh.error.message}</span>}
      </div>

      {/* AI Fundamental Evaluation & Timing Verdict (On-Demand with Analyze Button) */}
      <AiFundamentalCard symbol={symbol} />

      <div className="grid gap-5 md:grid-cols-2">
        <ValuationCard v={data.valuation} symbol={symbol} />
        <SectorFlags flags={data.flags} metrics={data.sector_metrics} />
      </div>

      <DepthPanel depth={data.depth} />
      <h2 className="font-bold text-base tracking-tight">Quarterly financials</h2>
      <FinancialsTable quarters={data.financials} />
      <h2 className="font-bold text-base tracking-tight">Dividend history</h2>
      <table className="text-sm">
        <thead>
          <tr className="text-muted-foreground">
            <th className="pr-6 text-left">FY</th>
            <th className="pr-6 text-right">Cash %</th>
            <th className="pr-6 text-right">Bonus %</th>
            <th className="pr-6 text-left">Right</th>
            <th className="text-left">Book closure</th>
          </tr>
        </thead>
        <tbody>
          {data.dividends.map((d) => (
            <tr key={`${d.fy_bs}-${d.book_closure_date}`}>
              <td className="pr-6">{d.fy_bs}</td>
              <td className="pr-6 text-right">{num(d.cash_pct)}</td>
              <td className="pr-6 text-right">{num(d.bonus_pct)}</td>
              <td className="pr-6">{d.right_ratio ?? "—"}</td>
              <td>{d.book_closure_date ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
