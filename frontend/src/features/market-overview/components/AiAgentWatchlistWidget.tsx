"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchAgentScan } from "@/features/watchlist/api";
import { useWatchlist } from "@/features/watchlist/useWatchlist";

export function AiAgentWatchlistWidget() {
  const { isWatchlisted, toggleWatchlist } = useWatchlist();

  const { data: scan, isLoading } = useQuery({
    queryKey: ["agent-market-scan"],
    queryFn: () => fetchAgentScan(false),
    staleTime: 5 * 60 * 1000,
  });

  const topBuys = scan?.topBuys.slice(0, 3) ?? [];
  const topWatch = scan?.topWatchlist.slice(0, 3) ?? [];

  return (
    <section className="overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card to-card p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/50 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30 text-sm">
              ✨
            </span>
            <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              AI Trade & Watchlist Agent
              <span className="rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                Top Signals
              </span>
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Scans 200+ listed equities across technicals, broker accumulation, and news catalysts to highlight today&apos;s high-conviction trades and watchlist alerts.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/watchlist"
            className="group inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-95 transition-all"
          >
            <span>Open AI Agent & Watchlist</span>
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-28 animate-pulse rounded-2xl bg-muted/30" />
          <div className="h-28 animate-pulse rounded-2xl bg-muted/30" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Top Buys Column */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🚀</span> Top High-Conviction Buys
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                {scan?.briefing.buyCount ?? 0} active buy setups
              </span>
            </div>

            <div className="space-y-2">
              {topBuys.map((s) => (
                <div
                  key={s.symbol}
                  className="flex items-center justify-between rounded-xl bg-card border border-border/60 p-2.5 transition-all hover:border-emerald-500/40"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/chart?symbol=${s.symbol}`}
                        className="font-mono text-sm font-bold text-foreground hover:text-primary hover:underline"
                      >
                        {s.symbol}
                      </Link>
                      <span className="text-[10px] text-muted-foreground">{s.sector}</span>
                      <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        NPR {s.close} ({s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(1)}%)
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                      {s.headlineReason}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleWatchlist(s.symbol)}
                      title={isWatchlisted(s.symbol) ? "In Watchlist" : "Add to Watchlist"}
                      className={`rounded-lg p-1.5 transition-colors ${
                        isWatchlisted(s.symbol)
                          ? "bg-amber-500/20 text-amber-500"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill={isWatchlisted(s.symbol) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                    <Link
                      href={`/chart?symbol=${s.symbol}`}
                      className="rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
                    >
                      Chart
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Watchlist Column */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>👁️</span> Top Watchlist / Consolidation Setups
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                {scan?.briefing.watchlistCount ?? 0} under watch
              </span>
            </div>

            <div className="space-y-2">
              {topWatch.map((s) => (
                <div
                  key={s.symbol}
                  className="flex items-center justify-between rounded-xl bg-card border border-border/60 p-2.5 transition-all hover:border-amber-500/40"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/chart?symbol=${s.symbol}`}
                        className="font-mono text-sm font-bold text-foreground hover:text-primary hover:underline"
                      >
                        {s.symbol}
                      </Link>
                      <span className="text-[10px] text-muted-foreground">{s.sector}</span>
                      <span className="font-mono text-[11px] font-bold text-foreground">
                        NPR {s.close} ({s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(1)}%)
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                      {s.headlineReason}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleWatchlist(s.symbol)}
                      title={isWatchlisted(s.symbol) ? "In Watchlist" : "Add to Watchlist"}
                      className={`rounded-lg p-1.5 transition-colors ${
                        isWatchlisted(s.symbol)
                          ? "bg-amber-500/20 text-amber-500"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill={isWatchlisted(s.symbol) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                    <Link
                      href={`/company/${s.symbol}`}
                      className="rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
                    >
                      Info
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
