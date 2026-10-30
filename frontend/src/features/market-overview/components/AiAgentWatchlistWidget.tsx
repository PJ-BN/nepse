"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatAiTimestamp } from "@/features/ai";
import { fetchAgentScan } from "@/features/watchlist/api";
import { useWatchlist } from "@/features/watchlist/useWatchlist";
import { useAuth } from "@/features/auth";

export function AiAgentWatchlistWidget() {
  const { isWatchlisted, toggleWatchlist } = useWatchlist();
  const { isAuthenticated, openAuthModal } = useAuth();

  const { data: scan, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["agent-market-scan"],
    queryFn: () => fetchAgentScan(false),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated,
  });

  const handleRefresh = () => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    fetchAgentScan(true).then(() => refetch());
  };

  if (!isAuthenticated) {
    return (
      <section className="overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card to-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/20 text-primary text-xl">
              ✨
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">AI Watchlist & Conviction Picks</h2>
                <span className="rounded-full bg-primary/15 border border-primary/25 px-2.5 py-0.5 text-[10px] font-bold text-primary uppercase">
                  Members Only
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sign in to view real-time multi-factor algorithmic ratings, swing trade setups, and breakout alerts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openAuthModal("login")}
            className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-background transition-opacity hover:opacity-90 cursor-pointer shadow-xs"
          >
            Sign In to Unlock
          </button>
        </div>
      </section>
    );
  }

  const isInitialLoading = (isLoading || isFetching) && !scan;
  const isReady = Boolean(scan);

  const topBuys = scan?.topBuys.slice(0, 3) ?? [];
  const topWatch = scan?.topWatchlist.slice(0, 3) ?? [];
  const timeInfo = formatAiTimestamp(scan?.briefing?.evaluatedAt);

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
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isReady
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                  : "bg-primary/15 text-primary border-primary/25"
              }`}>
                {isReady ? "Top Signals" : "Autonomous"}
              </span>
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Scans 200+ listed equities across technicals, broker accumulation, and news catalysts to highlight today&apos;s high-conviction trades and watchlist alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Timestamp Badge */}
          {scan?.briefing?.evaluatedAt && (
            <div
              className="flex items-center gap-1.5 rounded-lg bg-muted/60 border border-border/70 px-2.5 py-1 text-[11px] font-mono text-muted-foreground"
              title={`Generated at: ${timeInfo.formatted}`}
            >
              <span className="text-primary font-bold">🕒 AI Generated:</span>
              <span className="text-foreground font-semibold">{timeInfo.formatted}</span>
              <span className="text-primary font-medium">({timeInfo.relative})</span>
            </div>
          )}

          {isReady && (
            <button
              onClick={() => handleRefresh()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
              title="Re-run AI Agent Scan"
            >
              <span className={isFetching ? "animate-spin" : ""}>🔄</span>
              <span>{isFetching ? "Scanning…" : "Re-run Agent"}</span>
            </button>
          )}

          <Link
            href="/watchlist"
            className="group inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-95 transition-all"
          >
            <span>Open AI Agent & Watchlist</span>
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </div>

      {/* Active Refresh Banner (keeps previous results displayed while scanning!) */}
      {isFetching && scan && (
        <div className="flex items-center gap-2.5 rounded-xl border border-primary/40 bg-primary/10 p-2.5 text-xs font-medium text-foreground animate-in fade-in duration-200">
          <span className="flex h-2.5 w-2.5 rounded-full bg-primary animate-ping shrink-0" />
          <span>
            <strong>Re-scanning 200+ equities with AI in background…</strong> Showing previous scan from {timeInfo.formatted} until complete.
          </span>
        </div>
      )}

      {/* Initial Scanning / Loading State */}
      {isInitialLoading && (
        <div className="space-y-3 p-5 rounded-2xl bg-card/60 border border-primary/25 animate-in fade-in duration-300">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 animate-ping rounded-full bg-primary" />
              <span className="text-xs font-bold text-foreground">
                Loading AI Market Scan from database…
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono animate-pulse">
              Fetching broker accumulation, moving averages & top setups…
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-28 animate-pulse rounded-2xl bg-muted/30" />
            <div className="h-28 animate-pulse rounded-2xl bg-muted/30" />
          </div>
        </div>
      )}

      {/* Error State */}
      {isError && !isReady && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4 text-xs">
          <span className="text-rose-700 dark:text-rose-400 font-medium">
            Could not load AI agent scan: {error instanceof Error ? error.message : "Unavailable"}
          </span>
          <button
            onClick={() => refetch()}
            className="rounded-lg bg-rose-600 px-3 py-1.5 font-bold text-white hover:bg-rose-700 transition-colors cursor-pointer"
          >
            Retry Agent Scan
          </button>
        </div>
      )}

      {/* Ready State: Results (always shown when data exists) */}
      {isReady && (
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
              {topBuys.length > 0 ? (
                topBuys.map((stock) => (
                  <div
                    key={stock.symbol}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-3 hover:border-primary/40 transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        onClick={() => toggleWatchlist(stock.symbol)}
                        className="text-base text-muted-foreground hover:text-amber-500 transition-colors cursor-pointer shrink-0"
                        title={isWatchlisted(stock.symbol) ? "Remove from watchlist" : "Add to watchlist"}
                      >
                        {isWatchlisted(stock.symbol) ? "★" : "☆"}
                      </button>
                      <div className="min-w-0">
                        <Link
                          href={`/company/${stock.symbol}`}
                          className="font-bold text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                        >
                          <span>{stock.symbol}</span>
                          <span className="text-[10px] font-normal text-muted-foreground hidden sm:inline truncate max-w-[120px]">
                            {stock.name}
                          </span>
                        </Link>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                          {stock.headlineReason}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-foreground font-mono">
                        NPR {stock.close.toLocaleString()}
                      </div>
                      <div className="flex items-center justify-end gap-1.5 text-[11px]">
                        <span className={`font-semibold ${stock.changePct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
                          {stock.changePct >= 0 ? "+" : ""}{stock.changePct.toFixed(2)}%
                        </span>
                        <span className="rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold px-1.5 py-0.2 text-[10px]">
                          {stock.confidenceScore}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic py-3 text-center">
                  No immediate buy breakouts; selective accumulation recommended.
                </p>
              )}
            </div>
          </div>

          {/* Top Watchlist Column */}
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>👁️</span> Key Stocks to Watch
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                {scan?.briefing.watchlistCount ?? 0} on radar
              </span>
            </div>

            <div className="space-y-2">
              {topWatch.length > 0 ? (
                topWatch.map((stock) => (
                  <div
                    key={stock.symbol}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-3 hover:border-primary/40 transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        onClick={() => toggleWatchlist(stock.symbol)}
                        className="text-base text-muted-foreground hover:text-amber-500 transition-colors cursor-pointer shrink-0"
                        title={isWatchlisted(stock.symbol) ? "Remove from watchlist" : "Add to watchlist"}
                      >
                        {isWatchlisted(stock.symbol) ? "★" : "☆"}
                      </button>
                      <div className="min-w-0">
                        <Link
                          href={`/company/${stock.symbol}`}
                          className="font-bold text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                        >
                          <span>{stock.symbol}</span>
                          <span className="text-[10px] font-normal text-muted-foreground hidden sm:inline truncate max-w-[120px]">
                            {stock.name}
                          </span>
                        </Link>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                          {stock.headlineReason}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-foreground font-mono">
                        NPR {stock.close.toLocaleString()}
                      </div>
                      <div className="flex items-center justify-end gap-1.5 text-[11px]">
                        <span className={`font-semibold ${stock.changePct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
                          {stock.changePct >= 0 ? "+" : ""}{stock.changePct.toFixed(2)}%
                        </span>
                        <span className="rounded bg-blue-500/15 text-blue-700 dark:text-blue-400 font-bold px-1.5 py-0.2 text-[10px]">
                          {stock.confidenceScore}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic py-3 text-center">
                  All monitored stocks categorized in Buy / Sell zones.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
