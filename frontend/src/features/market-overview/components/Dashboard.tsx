"use client";

import { useLiveFeed } from "@/features/live-feed";
import { useMarketSummary } from "../hooks/useMarketSummary";
import { fmtCrore } from "../format";
import { IndexStrip } from "./IndexStrip";
import { MoversTable } from "./MoversTable";
import { TurnoverTreemap } from "./TurnoverTreemap";
import { AiMarketAnalysis } from "./AiMarketAnalysis";
import { AiAgentWatchlistWidget } from "./AiAgentWatchlistWidget";

export function Dashboard() {
  useLiveFeed();
  const { summary, isPending, isError, error } = useMarketSummary();

  if (isPending) {
    return (
      <div className="space-y-6 py-6 animate-pulse">
        <div className="h-24 rounded-2xl bg-card border border-border/60" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted/30" />
          ))}
        </div>
        <div className="h-44 rounded-2xl bg-card border border-border/60" />
        <div className="grid gap-5 md:grid-cols-3">
          <div className="h-72 rounded-2xl bg-card border border-border/60" />
          <div className="h-72 rounded-2xl bg-card border border-border/60" />
          <div className="h-72 rounded-2xl bg-card border border-border/60" />
        </div>
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 text-sm text-rose-600 space-y-2">
        <p className="font-bold">Market summary unavailable</p>
        <p className="text-xs text-rose-600/80">{String(error)}</p>
      </div>
    );
  }

  const totalBreadth = summary.advances + summary.declines + summary.unchanged;
  const advancePct = totalBreadth > 0 ? (summary.advances / totalBreadth) * 100 : 0;
  const declinePct = totalBreadth > 0 ? (summary.declines / totalBreadth) * 100 : 0;
  const unchangedPct = totalBreadth > 0 ? (summary.unchanged / totalBreadth) * 100 : 0;
  const breadthRatio =
    summary.declines > 0
      ? (summary.advances / summary.declines).toFixed(2)
      : summary.advances.toString();

  const isMarketOpen = summary.status === "OPEN";
  const isHalted = summary.status === "HALTED";
  const isPreOpen = summary.status === "PRE_OPEN";

  return (
    <div className="space-y-7 pb-10">
      {/* Circuit Breaker Alert */}
      {isHalted && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-600/40 bg-rose-600/15 p-4 text-sm font-semibold text-rose-700 dark:text-rose-300 shadow-sm flex items-center gap-3"
        >
          <span className="text-xl">⚠️</span>
          <div>
            <div className="font-bold">Trading Halted on NEPSE</div>
            <div className="text-xs font-normal opacity-90">
              Circuit breaker triggered. Trading resumes automatically when the halt period ends.
            </div>
          </div>
        </div>
      )}

      {/* Hero Header & Market Overview Banner */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Market Overview
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Nepal Stock Exchange · Real-time market pulse, sector performance & liquidity allocation
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Market Status Chip */}
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-bold shadow-2xs ${
                isMarketOpen
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                  : isPreOpen
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                  : isHalted
                  ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
                  : "bg-muted/40 text-muted-foreground border-border/80"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isMarketOpen
                    ? "bg-emerald-500 animate-pulse"
                    : isPreOpen
                    ? "bg-amber-500 animate-pulse"
                    : isHalted
                    ? "bg-rose-500"
                    : "bg-muted-foreground/60"
                }`}
              />
              <span>{summary.status.replace("_", " ")}</span>
            </span>

            {/* As of timestamp */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-xs font-medium text-muted-foreground font-mono">
              <span>🕒</span>
              <span>
                {summary.source === "live" ? "Live" : summary.source === "eod" ? "End of day" : "Historical"}
                {summary.as_of && ` · ${new Date(summary.as_of).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
              </span>
            </span>
          </div>
        </div>

        {/* Vital Metrics Ribbon */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Turnover metric card */}
          <div className="rounded-xl border border-border/70 bg-surface p-4 flex flex-col justify-between shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Market Turnover
            </div>
            <div className="my-1 font-mono text-2xl font-black tracking-tight text-foreground">
              {fmtCrore(summary.turnover)}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Cumulative Traded Value</span>
              <span className="font-mono font-semibold text-foreground">
                {summary.quotes?.length ?? 0} Listed Scrips
              </span>
            </div>
          </div>

          {/* Breadth card with visual ratio bar */}
          <div className="rounded-xl border border-border/70 bg-surface p-4 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Market Breadth (A / D)</span>
              <span className="font-mono text-foreground font-semibold">
                Ratio {breadthRatio} : 1
              </span>
            </div>

            {/* Visual ratio bar */}
            <div className="my-2 h-2.5 w-full overflow-hidden rounded-full bg-muted/40 flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${advancePct}%` }}
                title={`Advances: ${summary.advances}`}
              />
              <div
                className="h-full bg-muted-foreground/40 transition-all duration-500"
                style={{ width: `${unchangedPct}%` }}
                title={`Unchanged: ${summary.unchanged}`}
              />
              <div
                className="h-full bg-rose-500 transition-all duration-500"
                style={{ width: `${declinePct}%` }}
                title={`Declines: ${summary.declines}`}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span>▲</span> {summary.advances} Adv
              </span>
              <span className="text-muted-foreground flex items-center gap-1">
                <span>●</span> {summary.unchanged} Unch
              </span>
              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <span>▼</span> {summary.declines} Dec
              </span>
            </div>
          </div>

          {/* Market Feed & Session */}
          <div className="rounded-xl border border-border/70 bg-surface p-4 flex flex-col justify-between shadow-2xs sm:col-span-2 lg:col-span-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Trading Session Status
            </div>
            <div className="my-1 font-mono text-xl font-black text-foreground">
              {summary.status === "OPEN" ? "Continuous Trading" : summary.status === "CLOSED" ? "Post Market Session" : "Pre-Open / Non-Trading"}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Data Source</span>
              <span className="font-semibold text-foreground">
                {summary.source === "live" ? "Real-time WebSocket" : "Daily EOD Feed"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sector Indices Grid */}
      <IndexStrip index={summary.index} subIndices={summary.sub_indices} />

      {/* AI Market Status & Market Confidence Analysis (On-Demand with Analyze Button) */}
      <AiMarketAnalysis />

      {/* AI Trade & Watchlist Agent Widget */}
      <AiAgentWatchlistWidget />

      {/* Top Movers 3-column Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
            Market Movers & Liquidity Leaders
          </span>
          <span className="text-[11px] text-muted-foreground">Top 10 Scrips per Category</span>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <MoversTable title="Top Gainers" rows={summary.gainers} />
          <MoversTable title="Top Losers" rows={summary.losers} />
          <MoversTable title="Top Turnover" rows={summary.top_turnover} showTurnover />
        </div>
      </section>

      {/* Turnover Treemap */}
      <TurnoverTreemap quotes={summary.quotes} />
    </div>
  );
}
