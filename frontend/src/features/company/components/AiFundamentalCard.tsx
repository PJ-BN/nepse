"use client";

import { useState } from "react";
import { formatAiTimestamp, useCompanyAi } from "@/features/ai";
import { useAuth } from "@/features/auth";
import { num } from "../format";

export function AiFundamentalCard({ symbol }: { symbol: string }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isAuthenticated, openAuthModal } = useAuth();

  const { data, isLoading, isFetching, isError, error, refreshAi, isRefreshing, refetch } = useCompanyAi(symbol, {
    enabled: Boolean(symbol) && isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <section className="overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card to-card p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/20 text-primary text-lg">
              🔒
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground">AI Fundamental & Valuation Analysis</h2>
                <span className="rounded-full bg-primary/15 border border-primary/25 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                  Members Only
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sign in to view AI-evaluated balance sheet health, moat rating, fair value targets, and quarterly growth trends for {symbol}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openAuthModal("login")}
            className="shrink-0 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-background transition-opacity hover:opacity-90 cursor-pointer shadow-xs"
          >
            Sign In to Unlock
          </button>
        </div>
      </section>
    );
  }

  const isInitialLoading = (isLoading || isFetching) && !data;

  // Analyzing / Initial Loading State (when no previous evaluation exists)
  if (isInitialLoading) {
    return (
      <section className="rounded-2xl border border-primary/30 bg-card p-5 shadow-sm space-y-4 animate-in fade-in duration-300">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 animate-ping rounded-full bg-primary" />
            <h2 className="text-sm font-bold tracking-tight text-foreground">
              Loading AI Fundamental Evaluation for {symbol}…
            </h2>
          </div>
          <span className="text-xs text-muted-foreground animate-pulse font-mono">
            Checking database for latest research or evaluating financials…
          </span>
        </div>
        <div className="h-20 animate-pulse rounded-xl bg-muted/40" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-24 animate-pulse rounded-xl bg-muted/30" />
          <div className="h-24 animate-pulse rounded-xl bg-muted/30" />
        </div>
      </section>
    );
  }

  // Error State (when failed and no cached data exists)
  if ((isError || !data) && !isRefreshing) {
    return (
      <section className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-rose-700 dark:text-rose-400 font-medium">
            Could not load AI evaluation for {symbol}: {error ? error.message : "Unavailable"}
          </span>
          <button
            onClick={() => refetch()}
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1 font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
          >
            Retry Analysis
          </button>
        </div>
      </section>
    );
  }

  // Should never happen due to the checks above, but TS safety guard
  if (!data) return null;

  const isBuy = data.is_best_time;
  const verdictTheme = isBuy
    ? {
        border: "border-emerald-500/30",
        bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
        text: "text-emerald-700 dark:text-emerald-400",
        badge: "bg-emerald-600 text-white",
      }
    : {
        border: "border-amber-500/30",
        bg: "bg-amber-500/10 dark:bg-amber-500/15",
        text: "text-amber-700 dark:text-amber-400",
        badge: "bg-amber-600 text-white",
      };

  const valuationBadgeColors = {
    UNDERVALUED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    FAIR: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    OVERVALUED: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  }[data.valuation_status] || "bg-muted text-muted-foreground border-border";

  const timeInfo = formatAiTimestamp(data.evaluated_at);

  // Collapsed State
  if (isCollapsed) {
    return (
      <section className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs transition-all">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/20 text-primary text-xs">
              🤖
            </span>
            <span className="text-xs font-bold text-foreground">AI Verdict:</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${verdictTheme.badge}`}>
              {isBuy ? "BEST TIME TO INVEST" : "WAIT / PATIENCE"}
            </span>
            <span className="text-xs font-mono font-bold text-muted-foreground">
              Score: <strong className="text-foreground">{data.fundamental_score}/100</strong>
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${valuationBadgeColors}`}>
              {data.valuation_status}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground hidden md:inline">
              🕒 {timeInfo.full}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCollapsed(false)}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors cursor-pointer"
            >
              Expand Evaluation ▾
            </button>
            <button
              onClick={() => refreshAi()}
              disabled={isRefreshing}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50 cursor-pointer"
              title="Re-run deep evaluation"
            >
              <span className={isRefreshing ? "animate-spin inline-block" : ""}>🔄</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Expanded Analyzed State
  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4 transition-all">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow-2xs">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-foreground">AI Fundamental Evaluation</h2>
              <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-bold">
                {data.source === "agy" ? "AGY AI" : "QUANT ENGINE"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Intelligent equity appraisal, entry price ranges & timing assessment
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Timestamp Badge */}
          <div
            className="flex items-center gap-1.5 rounded-lg bg-muted/60 border border-border/70 px-2.5 py-1 text-[11px] font-mono text-muted-foreground"
            title={`Generated at: ${timeInfo.formatted}`}
          >
            <span className="text-primary font-bold">🕒 AI Generated:</span>
            <span className="text-foreground font-semibold">{timeInfo.formatted}</span>
            <span className="text-primary font-medium">({timeInfo.relative})</span>
          </div>

          <button
            onClick={() => setIsCollapsed(true)}
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
            title="Collapse view"
          >
            <span>Minimize ▴</span>
          </button>
          <button
            onClick={() => refreshAi()}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent transition-colors disabled:opacity-50 cursor-pointer"
            title="Re-run deep fundamental analysis with AGY"
          >
            <span className={isRefreshing ? "animate-spin" : ""}>🔄</span>
            {isRefreshing ? "Evaluating with AGY…" : "Re-evaluate with AGY"}
          </button>
        </div>
      </div>

      {/* Active Refreshing Alert Banner (keeps previous data displayed while refreshing!) */}
      {isRefreshing && (
        <div className="flex items-center gap-2.5 rounded-xl border border-primary/40 bg-primary/10 p-3 text-xs font-medium text-foreground animate-in fade-in duration-200">
          <span className="flex h-2.5 w-2.5 rounded-full bg-primary animate-ping shrink-0" />
          <div className="flex-1 flex flex-wrap items-center justify-between gap-1">
            <span>
              <strong>Re-analyzing with AGY in background…</strong> Displaying previously generated evaluation until fresh data is generated.
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">
              Previous run: {timeInfo.formatted}
            </span>
          </div>
        </div>
      )}

      {/* Primary Timing Verdict Banner */}
      <div className={`rounded-xl border p-4 ${verdictTheme.border} ${verdictTheme.bg} space-y-2.5`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${verdictTheme.badge}`}>
              {isBuy ? "BEST TIME TO INVEST" : "WAIT / EXERCISE PATIENCE"}
            </span>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${valuationBadgeColors}`}>
              {data.valuation_status}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-muted-foreground">Fundamental Score:</span>
            <span className="font-bold text-foreground bg-background/80 px-2 py-0.5 rounded-md border border-border/60">
              {data.fundamental_score}/100
            </span>
          </div>
        </div>

        <p className="text-sm font-semibold text-foreground leading-snug">
          {data.timing_assessment}
        </p>

        {data.wait_reason && (
          <div className="rounded-lg bg-background/70 border border-amber-500/25 p-2.5 text-xs text-amber-800 dark:text-amber-300">
            <strong>Key Caution / Waiting Factor:</strong> {data.wait_reason}
          </div>
        )}
      </div>

      {/* Recommended Entry & Target Price Ranges */}
      <div className="grid gap-3.5 sm:grid-cols-2">
        {/* Short Term Range (1-3 Months) */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">⚡</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Short Term Range (1 - 3 Months)
              </h3>
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Swing & Momentum</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-card p-2 border border-border/60">
              <div className="text-[10px] text-muted-foreground font-semibold">Accumulation Range</div>
              <div className="text-xs font-bold text-foreground font-mono">
                {data.short_term_range.min > 0
                  ? `NPR ${num(data.short_term_range.min)} - ${num(data.short_term_range.max)}`
                  : "At Current Level"}
              </div>
            </div>
            <div className="rounded-lg bg-card p-2 border border-border/60">
              <div className="text-[10px] text-muted-foreground font-semibold">Target Price</div>
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {data.short_term_range.target > 0 ? `NPR ${num(data.short_term_range.target)}` : "Market Highs"}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {data.short_term_range.outlook}
          </p>
        </div>

        {/* Long Term Range (1-3 Years) */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🎯</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Long Term Range (1 - 3 Years)
              </h3>
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Value & Compounding</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-card p-2 border border-border/60">
              <div className="text-[10px] text-muted-foreground font-semibold">Value Buy Zone</div>
              <div className="text-xs font-bold text-foreground font-mono">
                {data.long_term_range.min > 0
                  ? `NPR ${num(data.long_term_range.min)} - ${num(data.long_term_range.max)}`
                  : "Consolidation Zone"}
              </div>
            </div>
            <div className="rounded-lg bg-card p-2 border border-border/60">
              <div className="text-[10px] text-muted-foreground font-semibold">Intrinsic Fair Target</div>
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {data.long_term_range.target > 0 ? `NPR ${num(data.long_term_range.target)}` : "DCF Target"}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {data.long_term_range.outlook}
          </p>
        </div>
      </div>

      {/* Strengths, Risks & Catalysts */}
      <div className="grid gap-3 sm:grid-cols-3 pt-1">
        {/* Strengths */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
            <span className="text-xs">💪</span>
            <h4 className="text-xs font-bold uppercase tracking-wider">Key Strengths</h4>
          </div>
          <ul className="space-y-1.5 text-xs text-foreground/90">
            {data.strengths.map((str, idx) => (
              <li key={idx} className="flex items-start gap-1.5 leading-snug">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Risks */}
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
            <span className="text-xs">⚠️</span>
            <h4 className="text-xs font-bold uppercase tracking-wider">Risks & Overhangs</h4>
          </div>
          <ul className="space-y-1.5 text-xs text-foreground/90">
            {data.risks.map((risk, idx) => (
              <li key={idx} className="flex items-start gap-1.5 leading-snug">
                <span className="text-rose-600 dark:text-rose-400 font-bold">✕</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Catalysts */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
            <span className="text-xs">🚀</span>
            <h4 className="text-xs font-bold uppercase tracking-wider">Upcoming Catalysts</h4>
          </div>
          <ul className="space-y-1.5 text-xs text-foreground/90">
            {data.catalysts.map((cat, idx) => (
              <li key={idx} className="flex items-start gap-1.5 leading-snug">
                <span className="text-blue-600 dark:text-blue-400 font-bold">⚡</span>
                <span>{cat}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Summary footer */}
      {data.summary && (
        <div className="rounded-xl bg-muted/40 border border-border/70 p-3 text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
          <span className="text-primary font-bold text-sm">💡</span>
          <div>
            <strong className="text-foreground">Analyst Summary:</strong> {data.summary}
          </div>
        </div>
      )}
    </section>
  );
}
