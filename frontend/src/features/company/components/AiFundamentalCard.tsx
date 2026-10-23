"use client";

import { useState } from "react";
import { useCompanyAi } from "@/features/ai";
import { num } from "../format";

export function AiFundamentalCard({ symbol }: { symbol: string }) {
  const [hasRequested, setHasRequested] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { data, isLoading, isFetching, isError, error, refreshAi, isRefreshing, refetch } = useCompanyAi(symbol, {
    enabled: hasRequested,
  });

  const handleAnalyze = () => {
    setHasRequested(true);
    refetch();
  };

  const isAnalyzing = (hasRequested && (isLoading || isFetching)) && !data;

  // Unanalyzed State: Show clean invitation card with Analyze button
  if (!data && !isAnalyzing && !isError) {
    return (
      <section className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card to-card p-5 shadow-xs transition-all">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30 text-sm shadow-2xs">
                🤖
              </span>
              <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                AI Fundamental Evaluation for {symbol}
                <span className="rounded-full bg-primary/15 text-primary border border-primary/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  AGY AI
                </span>
              </h2>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Run intelligent equity appraisal, intrinsic valuation, risk analysis, and short vs. long term target ranges.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/30 border border-border/50 px-2 py-0.5 font-medium">
                <span className="text-emerald-500 font-bold">⏱</span> Timing Verdict (Buy vs Wait)
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/30 border border-border/50 px-2 py-0.5 font-medium">
                <span className="text-blue-500 font-bold">🎯</span> DCF & Target Buy Ranges
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/30 border border-border/50 px-2 py-0.5 font-medium">
                <span className="text-amber-500 font-bold">⭐</span> Fundamental Health Score
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <button
              onClick={handleAnalyze}
              className="group inline-flex items-center justify-center gap-2.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95 hover:shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="transition-transform group-hover:rotate-12">✨</span>
              <span>Run Fundamental AI Analysis</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Analyzing / Loading State
  if (isAnalyzing) {
    return (
      <section className="rounded-2xl border border-primary/30 bg-card p-5 shadow-sm space-y-4 animate-in fade-in duration-300">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 animate-ping rounded-full bg-primary" />
            <h2 className="text-sm font-bold tracking-tight text-foreground">
              Evaluating Fundamentals for {symbol} (AGY AI)…
            </h2>
          </div>
          <span className="text-xs text-muted-foreground animate-pulse font-mono">
            Analyzing balance sheet, valuation multiples, lock-in & peer metrics…
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

  // Error State
  if (isError || !data) {
    return (
      <section className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-rose-700 dark:text-rose-400 font-medium">
            Could not complete AI evaluation for {symbol}: {error ? error.message : "Unavailable"}
          </span>
          <button
            onClick={() => handleAnalyze()}
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1 font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 transition-colors"
          >
            Retry Analysis
          </button>
        </div>
      </section>
    );
  }

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
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCollapsed(false)}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors"
            >
              Expand Evaluation ▾
            </button>
            <button
              onClick={() => refreshAi()}
              disabled={isRefreshing}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50"
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
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow-2xs">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-foreground">AI Fundamental Evaluation</h2>
              <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-bold">
                POWERED BY AGY
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Intelligent equity appraisal, entry price ranges & timing assessment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[11px] text-muted-foreground hidden sm:inline font-mono">
            Evaluated {new Date(data.evaluated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={() => setIsCollapsed(true)}
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            title="Collapse view"
          >
            <span>Minimize ▴</span>
          </button>
          <button
            onClick={() => refreshAi()}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent transition-colors disabled:opacity-50"
            title="Re-run deep fundamental analysis with AGY"
          >
            <span className={isRefreshing ? "animate-spin" : ""}>🔄</span>
            {isRefreshing ? "Evaluating…" : "Re-evaluate with AGY"}
          </button>
        </div>
      </div>

      {/* Primary Timing Verdict Banner */}
      <div className={`rounded-xl border p-4 ${verdictTheme.border} ${verdictTheme.bg} space-y-2.5`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${verdictTheme.badge}`}>
              {isBuy ? "BEST TIME TO INVEST" : "WAIT / EXERCISE PATIENCE"}
            </span>
            <span className={`font-mono text-sm font-bold ${verdictTheme.text}`}>
              {data.verdict}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Fundamental Quality:</span>
            <span className="font-mono text-xs font-extrabold bg-background/80 px-2.5 py-0.5 rounded-full border border-border text-foreground">
              {data.fundamental_score} / 100
            </span>
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase ${valuationBadgeColors}`}>
              {data.valuation_status}
            </span>
          </div>
        </div>

        {/* Clear Answer to "Is this best time to invest or wait?" */}
        <div className="pt-1">
          <p className="text-sm font-medium text-foreground leading-relaxed">
            {data.timing_assessment}
          </p>
          {!isBuy && data.wait_reason && (
            <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs font-medium text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <span className="text-amber-500 font-bold shrink-0">⏳ Why wait:</span>
              <span>{data.wait_reason}</span>
            </div>
          )}
        </div>
      </div>

      {/* Best Price Ranges (Short Term vs Long Term) */}
      <div className="grid gap-3.5 sm:grid-cols-2">
        {/* Short Term Range */}
        <div className="rounded-xl border border-border/80 bg-surface p-4 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-blue-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Short-Term Investment (1 – 3 Months)
              </h3>
            </div>
            <span className="rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 border border-blue-500/20">
              TACTICAL
            </span>
          </div>

          <div className="pt-1 flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Best Buy Range:</span>
            <span className="font-mono text-base font-extrabold text-foreground">
              NPR {num(data.short_term_range.min)} – {num(data.short_term_range.max)}
            </span>
          </div>

          <div className="flex items-baseline justify-between border-t border-dashed border-border/60 pt-2">
            <span className="text-xs text-muted-foreground">Short-Term Target:</span>
            <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
              NPR {num(data.short_term_range.target)}
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed pt-1">
            {data.short_term_range.outlook}
          </p>
        </div>

        {/* Long Term Range */}
        <div className="rounded-xl border border-border/80 bg-surface p-4 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-purple-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Long-Term Investment (1 – 3 Years)
              </h3>
            </div>
            <span className="rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold px-2 py-0.5 border border-purple-500/20">
              COMPOUNDER
            </span>
          </div>

          <div className="pt-1 flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Best Accumulation Range:</span>
            <span className="font-mono text-base font-extrabold text-foreground">
              NPR {num(data.long_term_range.min)} – {num(data.long_term_range.max)}
            </span>
          </div>

          <div className="flex items-baseline justify-between border-t border-dashed border-border/60 pt-2">
            <span className="text-xs text-muted-foreground">Long-Term Fair Target:</span>
            <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
              NPR {num(data.long_term_range.target)}
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed pt-1">
            {data.long_term_range.outlook}
          </p>
        </div>
      </div>

      {/* Strengths, Risks & Catalysts */}
      <div className="grid gap-3 sm:grid-cols-3 text-xs">
        {/* Strengths */}
        {data.strengths?.length > 0 && (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 space-y-2">
            <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <span>✓</span> Core Strengths
            </div>
            <ul className="space-y-1.5 text-muted-foreground">
              {data.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold shrink-0">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks */}
        {data.risks?.length > 0 && (
          <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-3.5 space-y-2">
            <div className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <span>⚠️</span> Key Risks
            </div>
            <ul className="space-y-1.5 text-muted-foreground">
              {data.risks.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-rose-500 font-bold shrink-0">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Catalysts */}
        {data.catalysts?.length > 0 && (
          <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 p-3.5 space-y-2">
            <div className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <span>🚀</span> Growth Catalysts
            </div>
            <ul className="space-y-1.5 text-muted-foreground">
              {data.catalysts.map((c, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-blue-500 font-bold shrink-0">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Executive Summary */}
      {data.summary && (
        <div className="rounded-xl border border-border/60 bg-muted/15 p-4 text-xs text-muted-foreground">
          <span className="font-bold text-foreground">Executive Thesis: </span>
          {data.summary}
        </div>
      )}
    </section>
  );
}
