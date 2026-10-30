"use client";

import { useState } from "react";
import { formatAiTimestamp, useMarketAi } from "@/features/ai";
import { useAuth } from "@/features/auth";

export function AiMarketAnalysis() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isAuthenticated, openAuthModal } = useAuth();

  const { data, isLoading, isFetching, isError, error, refreshAi, isRefreshing, refetch } = useMarketAi({
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <section className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card to-card p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/20 text-primary text-lg">
              🔒
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground">AI Market Dynamics & Macro Read</h2>
                <span className="rounded-full bg-primary/15 border border-primary/25 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                  Members Only
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sign in to unlock autonomous institutional market regime analysis, liquidity flow scans, and tactical playbooks.
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

  // Initial Loading State (when no previous evaluation exists in DB)
  if (isInitialLoading) {
    return (
      <section className="rounded-2xl border border-primary/30 bg-card/80 p-5 shadow-sm space-y-4 animate-in fade-in duration-300">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 animate-ping rounded-full bg-primary" />
            <h2 className="text-sm font-bold tracking-tight text-foreground">
              Loading NEPSE Market AI Dynamics…
            </h2>
          </div>
          <span className="text-xs text-muted-foreground animate-pulse font-mono">
            Fetching latest market synthesis from database…
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-20 animate-pulse rounded-xl bg-muted/40" />
          <div className="h-20 animate-pulse rounded-xl bg-muted/40" />
          <div className="h-20 animate-pulse rounded-xl bg-muted/40" />
        </div>
        <div className="h-14 animate-pulse rounded-xl bg-muted/30" />
      </section>
    );
  }

  // Error State (when failed and no data exists)
  if ((isError || !data) && !isRefreshing) {
    return (
      <section className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-rose-700 dark:text-rose-400 font-medium">
            Could not load AI market analysis: {error ? error.message : "Unavailable"}
          </span>
          <button
            onClick={() => refetch()}
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1 font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
          >
            Retry Scan
          </button>
        </div>
      </section>
    );
  }

  if (!data) return null;

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    BULLISH: { bg: "bg-emerald-500/10 dark:bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-500/30" },
    "MODERATELY BULLISH": { bg: "bg-teal-500/10 dark:bg-teal-500/15", text: "text-teal-700 dark:text-teal-400", border: "border-teal-500/30" },
    "SIDEWAYS / NEUTRAL": { bg: "bg-blue-500/10 dark:bg-blue-500/15", text: "text-blue-700 dark:text-blue-400", border: "border-blue-500/30" },
    "BEARISH REVERSAL": { bg: "bg-amber-500/10 dark:bg-amber-500/15", text: "text-amber-700 dark:text-amber-400", border: "border-amber-500/30" },
    BEARISH: { bg: "bg-rose-500/10 dark:bg-rose-500/15", text: "text-rose-700 dark:text-rose-400", border: "border-rose-500/30" },
  };

  const currentTheme = statusColors[data.market_status] || statusColors["SIDEWAYS / NEUTRAL"];

  const confidenceScoreColor =
    data.confidence_score >= 70
      ? "bg-emerald-600"
      : data.confidence_score >= 50
      ? "bg-amber-500"
      : "bg-rose-600";

  const timeInfo = formatAiTimestamp(data.evaluated_at);

  // Compact / Collapsed state
  if (isCollapsed) {
    return (
      <section className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs transition-all">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/20 text-primary text-xs">
              ✨
            </span>
            <span className="text-xs font-bold text-foreground">NEPSE AI Pulse:</span>
            <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${currentTheme.border} ${currentTheme.bg} ${currentTheme.text}`}>
              {data.market_status}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              Confidence: <strong className="text-foreground">{data.confidence_score}% ({data.confidence_level})</strong>
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
              Expand Analysis ▾
            </button>
            <button
              onClick={() => refreshAi()}
              disabled={isRefreshing}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50 cursor-pointer"
              title="Re-run real-time analysis"
            >
              <span className={isRefreshing ? "animate-spin inline-block" : ""}>🔄</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Full Expanded Analyzed State
  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4 transition-all">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs shadow-2xs">
            ✨
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight flex items-center gap-2 text-foreground">
              NEPSE Market Status & Confidence
              <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.2 text-[10px] font-bold">
                {data.source === "agy" ? "AGY AI" : "QUANT SYNTHESIS"}
              </span>
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Real-time synthesis of market breadth, liquidity turnover, and index momentum
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
            title="Collapse into single-line view"
          >
            <span>Minimize ▴</span>
          </button>
          <button
            onClick={() => refreshAi()}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50 cursor-pointer"
            title="Trigger real-time re-analysis using AGY"
          >
            <span className={`text-[11px] ${isRefreshing ? "animate-spin" : ""}`}>🔄</span>
            {isRefreshing ? "Analyzing with AGY…" : "Refresh AI"}
          </button>
        </div>
      </div>

      {/* Active Refreshing Alert Banner (keeps previous data displayed while refreshing!) */}
      {isRefreshing && (
        <div className="flex items-center gap-2.5 rounded-xl border border-primary/40 bg-primary/10 p-3 text-xs font-medium text-foreground animate-in fade-in duration-200">
          <span className="flex h-2.5 w-2.5 rounded-full bg-primary animate-ping shrink-0" />
          <div className="flex-1 flex flex-wrap items-center justify-between gap-1">
            <span>
              <strong>Updating Market Intelligence with AGY…</strong> Showing previous analysis until fresh data completes.
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">
              Previous pulse: {timeInfo.formatted}
            </span>
          </div>
        </div>
      )}

      {/* Top 3 KPI metrics */}
      <div className="grid gap-3.5 sm:grid-cols-3">
        {/* Market Status Card */}
        <div className={`rounded-xl border p-4 ${currentTheme.border} ${currentTheme.bg}`}>
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Market Status & Trend
          </div>
          <div className={`mt-1 text-base font-extrabold tracking-tight ${currentTheme.text}`}>
            {data.market_status}
          </div>
          <div className="mt-1 text-xs text-muted-foreground font-medium">
            Sentiment: <strong className="text-foreground">{data.sentiment}</strong>
          </div>
        </div>

        {/* Confidence Gauge */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Confidence Index</span>
            <span className="text-xs font-extrabold text-foreground font-mono">{data.confidence_score}%</span>
          </div>
          {/* Progress bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all duration-500 ${confidenceScoreColor}`}
              style={{ width: `${Math.min(100, Math.max(0, data.confidence_score))}%` }}
            />
          </div>
          <div className="text-[11px] text-muted-foreground">
            Conviction Level: <strong className="text-foreground">{data.confidence_level}</strong>
          </div>
        </div>

        {/* Actionable Guidance */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-primary">
            Actionable Playbook
          </div>
          <p className="text-xs text-foreground font-medium leading-relaxed">
            {data.actionable_advice}
          </p>
        </div>
      </div>

      {/* Breadth & Turnover Quantitative Evaluation */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <span>▲</span>
            <span>Advance / Decline Breadth Dynamics</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {data.breadth_evaluation}
          </p>
        </div>

        <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <span>⚡</span>
            <span>Turnover & Liquidity Assessment</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {data.turnover_evaluation}
          </p>
        </div>
      </div>

      {/* Drivers & Risk Catalysts */}
      <div className="grid gap-3 sm:grid-cols-2 pt-1">
        {/* Key Drivers */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
            <span className="text-xs">🚀</span>
            <h3 className="text-xs font-bold uppercase tracking-wider">Primary Catalysts & Drivers</h3>
          </div>
          <ul className="space-y-1.5 text-xs text-foreground/90">
            {data.key_drivers.map((driver, idx) => (
              <li key={idx} className="flex items-start gap-1.5 leading-snug">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                <span>{driver}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Risks */}
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
            <span className="text-xs">⚠️</span>
            <h3 className="text-xs font-bold uppercase tracking-wider">Market Vulnerabilities & Risks</h3>
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
      </div>

      {/* Summary Footer */}
      {data.summary && (
        <div className="rounded-xl bg-muted/40 border border-border/70 p-3 text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
          <span className="text-primary font-bold text-sm">💡</span>
          <div>
            <strong className="text-foreground">Strategist Synthesis:</strong> {data.summary}
          </div>
        </div>
      )}
    </section>
  );
}
