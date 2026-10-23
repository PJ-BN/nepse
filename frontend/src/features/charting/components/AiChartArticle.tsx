"use client";

import type { ChartAiAnalysis } from "@/features/ai/types";

export function AiChartArticle({
  analysis,
  isRefreshing,
  onRefresh,
  onApplyDrawings,
  onClearDrawings,
  onApplyIndicators,
  isOverlaysActive,
}: {
  analysis: ChartAiAnalysis;
  isRefreshing: boolean;
  onRefresh: () => void;
  onApplyDrawings: () => void;
  onClearDrawings: () => void;
  onApplyIndicators: () => void;
  isOverlaysActive: boolean;
}) {
  const stanceThemes = {
    "STRONG BULLISH": {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      border: "border-emerald-500/30",
      text: "text-emerald-700 dark:text-emerald-400",
      badge: "bg-emerald-600 text-white",
    },
    "BULLISH BREAKOUT": {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      border: "border-emerald-500/30",
      text: "text-emerald-700 dark:text-emerald-400",
      badge: "bg-emerald-600 text-white",
    },
    BULLISH: {
      bg: "bg-teal-500/10 dark:bg-teal-500/20",
      border: "border-teal-500/30",
      text: "text-teal-700 dark:text-teal-400",
      badge: "bg-teal-600 text-white",
    },
    "NEUTRAL / ACCUMULATION": {
      bg: "bg-blue-500/10 dark:bg-blue-500/20",
      border: "border-blue-500/30",
      text: "text-blue-700 dark:text-blue-400",
      badge: "bg-blue-600 text-white",
    },
    BEARISH: {
      bg: "bg-rose-500/10 dark:bg-rose-500/20",
      border: "border-rose-500/30",
      text: "text-rose-700 dark:text-rose-400",
      badge: "bg-rose-600 text-white",
    },
    "REVERSAL WATCH": {
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
      border: "border-amber-500/30",
      text: "text-amber-700 dark:text-amber-400",
      badge: "bg-amber-600 text-white",
    },
  };

  const theme = stanceThemes[analysis.stance] || stanceThemes.BULLISH;

  return (
    <article className="mt-4 rounded-xl border border-border/80 bg-gradient-to-b from-card to-card/60 p-5 shadow-sm space-y-5">
      {/* Article Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide ${theme.badge}`}>
              {analysis.stance}
            </span>
            <span className="rounded bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-bold">
              AGY CMT ENGINE
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {analysis.symbol} · {analysis.timeframe}
            </span>
          </div>

          <h2 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">
            {analysis.title}
          </h2>
          <p className="text-xs text-muted-foreground">
            Technically evaluated {new Date(analysis.evaluated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · AI Confidence Score: {analysis.confidence_score}%
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {isOverlaysActive ? (
            <button
              onClick={onClearDrawings}
              className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-500/20 transition-colors"
            >
              ✕ Clear AI Lines
            </button>
          ) : (
            <button
              onClick={onApplyDrawings}
              className="rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors flex items-center gap-1.5"
            >
              <span>✨</span> Draw on Chart
            </button>
          )}

          <button
            onClick={onApplyIndicators}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent transition-colors flex items-center gap-1.5"
            title="Configure best moving averages and momentum oscillators"
          >
            <span>📊</span> Apply AI Indicators
          </button>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-accent transition-colors disabled:opacity-50"
            title="Re-analyze chart price action"
          >
            <span className={isRefreshing ? "animate-spin" : ""}>🔄</span>
          </button>
        </div>
      </div>

      {/* Trade Setup Matrix (What to do execution cards) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Entry Zone */}
        <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-1 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Action & Buy Zone</span>
            <span className="text-primary font-mono text-[10px] font-extrabold">{analysis.action}</span>
          </div>
          <div className="font-mono text-base font-extrabold text-foreground">
            NPR {analysis.entry_zone.min} – {analysis.entry_zone.max}
          </div>
          <p className="text-[11px] text-muted-foreground">Optimal accumulation band on pullbacks</p>
        </div>

        {/* Target 1 */}
        <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-1 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Primary Target (T1)</span>
            {analysis.targets[0]?.upside_pct && (
              <span className="text-emerald-600 text-[10px] font-bold">+{analysis.targets[0].upside_pct}%</span>
            )}
          </div>
          <div className="font-mono text-base font-extrabold text-emerald-600 dark:text-emerald-400">
            NPR {analysis.targets[0]?.price ?? "—"}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{analysis.targets[0]?.label ?? "Intermediate supply"}</p>
        </div>

        {/* Target 2 */}
        <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-1 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Extended Target (T2)</span>
            {analysis.targets[1]?.upside_pct && (
              <span className="text-emerald-600 text-[10px] font-bold">+{analysis.targets[1].upside_pct}%</span>
            )}
          </div>
          <div className="font-mono text-base font-extrabold text-emerald-600 dark:text-emerald-400">
            NPR {analysis.targets[1]?.price ?? "—"}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{analysis.targets[1]?.label ?? "Major extension"}</p>
        </div>

        {/* Invalidation / Stop Loss */}
        <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-1 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Stop Loss / Invalidation</span>
            <span className="text-primary font-mono text-[10px] font-bold">R:R {analysis.risk_reward_ratio}</span>
          </div>
          <div className="font-mono text-base font-extrabold text-rose-600 dark:text-rose-400">
            NPR {analysis.stop_loss.price}
          </div>
          <p className="text-[11px] text-muted-foreground">Hard daily close below structural floor</p>
        </div>
      </div>

      {/* Applied Tools & Indicators Pills */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-foreground">Tools Plotted on this Chart:</span>
          <span className="text-[11px] text-muted-foreground">
            {analysis.recommended_drawings.length} drawing tools · {analysis.recommended_indicators.length} indicators
          </span>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {analysis.recommended_drawings.map((d, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background px-3 py-1 text-[11px] font-medium shadow-2xs"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color || "#3b82f6" }} />
              <span className="font-semibold text-foreground">{d.label}</span>
              <span className="text-muted-foreground text-[10px]">({d.name})</span>
            </span>
          ))}

          {analysis.recommended_indicators.map((ind, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background px-3 py-1 text-[11px] font-medium shadow-2xs"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ind.color }} />
              <span className="font-semibold text-foreground uppercase">{ind.type} {ind.period}</span>
            </span>
          ))}
        </div>
      </div>

      {/* The 3-Part Technical Research Article */}
      <div className="space-y-4 pt-1">
        {/* Section 1: Why these tools were chosen */}
        <section className="rounded-xl border border-border/70 bg-card p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/20 text-primary text-xs font-extrabold">
              1
            </span>
            <h3>Why These Tools & Indicators Were Chosen</h3>
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line font-normal space-y-2">
            {analysis.article.why_tools_used}
          </div>
        </section>

        {/* Section 2: What does this chart say */}
        <section className="rounded-xl border border-border/70 bg-card p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/20 text-primary text-xs font-extrabold">
              2
            </span>
            <h3>What Does This Chart Say? (Price Action & Market Structure)</h3>
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line font-normal space-y-2">
            {analysis.article.what_chart_says}
          </div>
        </section>

        {/* Section 3: What to do with this */}
        <section className="rounded-xl border border-border/70 bg-card p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/20 text-primary text-xs font-extrabold">
              3
            </span>
            <h3>What To Do With This? (Actionable Strategy & Risk Playbook)</h3>
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line font-normal space-y-2">
            {analysis.article.what_to_do}
          </div>
        </section>

        {/* Risk factors callout */}
        {analysis.article.risk_factors?.length > 0 && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs space-y-2">
            <div className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <span>⚠️</span> Thesis Invalidation & Key Risk Watchouts
            </div>
            <ul className="space-y-1 text-muted-foreground pl-2">
              {analysis.article.risk_factors.map((rf, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-rose-500 font-bold shrink-0">•</span>
                  <span>{rf}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}
