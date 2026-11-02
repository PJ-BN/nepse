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
import { CompanyNewsSection } from "@/features/news";
import { PageContainer, TableContainer } from "@/shared/ui";

export function CompanyPage({ symbol }: { symbol: string }) {
  const { data, error, isLoading } = useCompanyFull(symbol);
  const refresh = useRefreshCompany(symbol);

  const refreshButton = (
    <button
      className="rounded-xl border border-border/80 px-3 py-1.5 text-xs font-semibold hover:bg-muted/50 disabled:opacity-50 transition-colors"
      onClick={() => refresh.mutate()}
      disabled={refresh.isPending}
      title="Scrape and refresh latest company data"
    >
      {refresh.isPending ? "Refreshing…" : "Refresh fundamentals"}
    </button>
  );

  if (isLoading) {
    return (
      <PageContainer maxWidth="standard">
        <div className="space-y-6 py-6 animate-pulse">
          <div className="h-32 rounded-3xl bg-card border border-border/60" />
          <div className="h-44 rounded-3xl bg-card border border-border/60" />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="h-64 rounded-3xl bg-card border border-border/60" />
            <div className="h-64 rounded-3xl bg-card border border-border/60" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer maxWidth="standard">
        <div className="space-y-4 rounded-3xl border border-rose-500/30 bg-rose-500/5 p-6 sm:p-8">
          <p className="text-sm font-semibold text-rose-600">
            {error ? `Could not load ${symbol}: ${error.message}` : `No data found for ${symbol}.`}
          </p>
          <div className="flex items-center gap-3">
            {refreshButton}
            {refresh.error && <p className="text-xs text-rose-600">{refresh.error.message}</p>}
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="standard" className="space-y-6">
      <Profile data={data} />

      <div className="flex flex-wrap items-center gap-2.5">
        <LockinBadge daysLeft={data.lockin.days_left} expiry={data.lockin.expiry} />
        {refreshButton}
        {refresh.error && <span className="text-xs text-rose-600">{refresh.error.message}</span>}
      </div>

      {/* AI Fundamental Evaluation & Timing Verdict */}
      <AiFundamentalCard symbol={symbol} />

      <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
        <ValuationCard v={data.valuation} symbol={symbol} />
        <SectorFlags flags={data.flags} metrics={data.sector_metrics} />
      </div>

      {/* Company News & Actionable AI Impact */}
      <CompanyNewsSection symbol={symbol} />

      <DepthPanel depth={data.depth} />

      <section className="space-y-3">
        <h2 className="font-bold text-base sm:text-lg tracking-tight text-foreground">
          Quarterly Financials
        </h2>
        <FinancialsTable quarters={data.financials} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base sm:text-lg tracking-tight text-foreground">
            Dividend History & Bonus Shares
          </h2>
          <span className="text-xs text-muted-foreground font-mono">
            {data.dividends.length} Records
          </span>
        </div>

        {data.dividends.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No dividend records reported yet.</p>
        ) : (
          <TableContainer scrollHint>
            <table className="min-w-full text-xs text-right tabular-nums">
              <thead className="bg-muted/20 border-b border-border/60 text-[10px] uppercase font-bold text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-3 text-left">FY (BS)</th>
                  <th className="py-2.5 px-3">Cash %</th>
                  <th className="py-2.5 px-3">Bonus %</th>
                  <th className="py-2.5 px-3 text-left">Right Ratio</th>
                  <th className="py-2.5 px-4 text-left">Book Closure Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono">
                {data.dividends.map((d) => (
                  <tr key={`${d.fy_bs}-${d.book_closure_date}`} className="hover:bg-muted/25 transition-colors">
                    <td className="py-2.5 px-3 text-left font-bold text-foreground">{d.fy_bs}</td>
                    <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-semibold">{num(d.cash_pct)}</td>
                    <td className="py-2.5 px-3 text-blue-600 dark:text-blue-400 font-semibold">{num(d.bonus_pct)}</td>
                    <td className="py-2.5 px-3 text-left font-sans">{d.right_ratio ?? "—"}</td>
                    <td className="py-2.5 px-4 text-left text-muted-foreground font-sans">{d.book_closure_date ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
        )}
      </section>
    </PageContainer>
  );
}
