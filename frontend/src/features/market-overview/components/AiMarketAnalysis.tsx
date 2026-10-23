"use client";

import { useState } from "react";
import { useMarketAi } from "@/features/ai";

export function AiMarketAnalysis() {
  const [hasRequested, setHasRequested] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { data, isLoading, isFetching, isError, error, refreshAi, isRefreshing, refetch } = useMarketAi({
    enabled: hasRequested,
  });

  const handleAnalyze = () => {
    setHasRequested(true);
    refetch();
  };

  const isAnalyzing = (hasRequested && (isLoading || isFetching)) && !data;

  // Unanalyzed State: Don't analyze automatically! Show a stylish call-to-action button
  if (!data && !isAnalyzing && !isError) {
    return (
      <section className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card to-card/90 p-5 shadow-sm transition-all duration-300">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30 text-sm shadow-2xs">
                ✨
              </span>
              <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                NEPSE AI Market Intelligence
                <span className="rounded-full bg-primary/15 text-primary border border-primary/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  AGY AI
                </span>
              </h2>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Generate an on-demand real-time AI synthesis of market breadth, liquidity turnover, institutional momentum, and actionable tactical bias.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/30 border border-border/50 px-2 py-0.5 font-medium">
                <span className="text-emerald-500 font-bold">▲</span> Breadth Dynamics
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/30 border border-border/50 px-2 py-0.5 font-medium">
                <span className="text-blue-500 font-bold">⚡</span> Order Flow & Turnover
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/30 border border-border/50 px-2 py-0.5 font-medium">
                <span className="text-amber-500 font-bold">🎯</span> Tactical Positioning
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <button
              onClick={handleAnalyze}
              className="group inline-flex items-center justify-center gap-2.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95 hover:shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="transition-transform group-hover:rotate-12">✨</span>
              <span>Analyze Market with AI</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Analyzing / Loading State
  if (isAnalyzing) {
    return (
      <section className="rounded-2xl border border-primary/30 bg-card/80 p-5 shadow-sm space-y-4 animate-in fade-in duration-300">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 animate-ping rounded-full bg-primary" />
            <h2 className="text-sm font-bold tracking-tight text-foreground">
              Analyzing NEPSE Market Dynamics with AGY AI…
            </h2>
          </div>
          <span className="text-xs text-muted-foreground animate-pulse font-mono">
            Scanning order book, liquidity & breadth momentum…
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

  // Error State
  if (isError || !data) {
    return (
      <section className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-rose-700 dark:text-rose-400 font-medium">
            Could not complete AI market analysis: {error ? error.message : "Unavailable"}
          </span>
          <button
            onClick={() => handleAnalyze()}
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1 font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 transition-colors"
          >
            Retry Scan
          </button>
        </div>
      </section>
    );
  }

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

  // Compact / Collapsed state if user prefers uncluttered dashboard
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
            <span className="hidden md:inline text-xs text-muted-foreground">· Sentiment: {data.sentiment}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCollapsed(false)}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors"
            >
              Expand Analysis ▾
            </button>
            <button
              onClick={() => refreshAi()}
              disabled={isRefreshing}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50"
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
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs shadow-2xs">
            ✨
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight flex items-center gap-2 text-foreground">
              NEPSE Market Status & Confidence
              <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.2 text-[10px] font-bold">
                AGY AI
              </span>
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Real-time synthesis of market breadth, liquidity turnover, and index momentum
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground hidden sm:inline font-mono">
            Evaluated {new Date(data.evaluated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={() => setIsCollapsed(true)}
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            title="Collapse into single-line view"
          >
            <span>Minimize ▴</span>
          </button>
          <button
            onClick={() => refreshAi()}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50"
            title="Trigger real-time re-analysis using AGY"
          >
            <span className={`text-[11px] ${isRefreshing ? "animate-spin" : ""}`}>🔄</span>
            {isRefreshing ? "Analyzing…" : "Refresh AI"}
          </button>
        </div>
      </div>

      {/* Top 3 KPI metrics */}
      <div className="grid gap-3.5 sm:grid-cols-3">
        {/* Market Status Card */}
        <div className={`rounded-xl border p-4 ${currentTheme.border} ${currentTheme.bg}`}>
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Market Status & Trend
          </div>
          <div className={`mt-1 font-mono text-base font-extrabold ${currentTheme.text} flex items-center gap-1.5`}>
            <span>{data.market_status}</span>
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
            <span>Sentiment:</span>
            <span className="font-semibold text-foreground">{data.sentiment}</span>
          </div>
        </div>

        {/* Market Confidence Meter */}
        <div className="rounded-xl border border-border/70 bg-surface p-4">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Market Confidence</span>
            <span className="font-bold text-foreground font-mono">{data.confidence_score}% ({data.confidence_level})</span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted/40">
            <div
              className={`h-full rounded-full transition-all duration-500 ${confidenceScoreColor}`}
              style={{ width: `${Math.min(100, Math.max(5, data.confidence_score))}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>0% Low</span>
            <span>50% Neutral</span>
            <span>100% High</span>
          </div>
        </div>

        {/* Tactical Guidance */}
        <div className="rounded-xl border border-border/70 bg-surface p-4">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Tactical Action
          </div>
          <p className="mt-1.5 text-xs text-foreground font-medium leading-relaxed line-clamp-3">
            {data.actionable_advice}
          </p>
        </div>
      </div>

      {/* Summary and Market Breadth row */}
      <div className="rounded-xl border border-border/60 bg-muted/15 p-4 space-y-2.5 text-xs">
        <div className="flex items-start gap-2">
          <span className="font-bold text-primary shrink-0">Insight:</span>
          <p className="text-foreground leading-relaxed font-medium">{data.summary}</p>
        </div>

        <div className="grid gap-2.5 pt-2 border-t border-border/50 sm:grid-cols-2 text-[11px]">
          <div>
            <span className="text-muted-foreground font-semibold">Breadth: </span>
            <span className="text-foreground font-medium">{data.breadth_evaluation}</span>
          </div>
          <div>
            <span className="text-muted-foreground font-semibold">Turnover: </span>
            <span className="text-foreground font-medium">{data.turnover_evaluation}</span>
          </div>
        </div>
      </div>

      {/* Drivers & Risks Pills */}
      <div className="grid gap-3 sm:grid-cols-2 text-xs">
        {data.key_drivers?.length > 0 && (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 space-y-1.5">
            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
              <span>▲</span> Key Upside Drivers
            </div>
            <ul className="space-y-1.5 text-muted-foreground">
              {data.key_drivers.map((d, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.risks?.length > 0 && (
          <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-3.5 space-y-1.5">
            <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400 mb-1 flex items-center gap-1.5">
              <span>⚠️</span> Watchouts & Risks
            </div>
            <ul className="space-y-1.5 text-muted-foreground">
              {data.risks.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
