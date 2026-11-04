"use client";

import { useState } from "react";
import { formatAiTimestamp } from "@/features/ai";
import type { ChartAiAnalysis, ChartQuant } from "@/features/ai/types";

const STANCE_THEMES: Record<
  string,
  { bg: string; border: string; text: string; badge: string; dot: string }
> = {
  "STRONG BULLISH": {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    border: "border-emerald-500/30",
    text: "text-emerald-700 dark:text-emerald-400",
    badge: "bg-emerald-600 text-white",
    dot: "bg-emerald-500",
  },
  "BULLISH BREAKOUT": {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    border: "border-emerald-500/30",
    text: "text-emerald-700 dark:text-emerald-400",
    badge: "bg-emerald-600 text-white",
    dot: "bg-emerald-500",
  },
  BULLISH: {
    bg: "bg-teal-500/10 dark:bg-teal-500/20",
    border: "border-teal-500/30",
    text: "text-teal-700 dark:text-teal-400",
    badge: "bg-teal-600 text-white",
    dot: "bg-teal-500",
  },
  "NEUTRAL / ACCUMULATION": {
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    border: "border-blue-500/30",
    text: "text-blue-700 dark:text-blue-400",
    badge: "bg-blue-600 text-white",
    dot: "bg-blue-500",
  },
  BEARISH: {
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    border: "border-rose-500/30",
    text: "text-rose-700 dark:text-rose-400",
    badge: "bg-rose-600 text-white",
    dot: "bg-rose-500",
  },
  "REVERSAL WATCH": {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    border: "border-amber-500/30",
    text: "text-amber-700 dark:text-amber-400",
    badge: "bg-amber-600 text-white",
    dot: "bg-amber-500",
  },
};

const biasColor = (b: number) =>
  b > 0
    ? "text-emerald-600 dark:text-emerald-400"
    : b < 0
    ? "text-rose-600 dark:text-rose-400"
    : "text-muted-foreground";

const biasDot = (b: number) =>
  b > 0 ? "bg-emerald-500" : b < 0 ? "bg-rose-500" : "bg-muted-foreground/50";

export interface AiChartSidebarProps {
  symbol: string;
  resolution: string;
  analysis?: ChartAiAnalysis;
  isLoading: boolean;
  isRefreshing: boolean;
  isError: boolean;
  error?: unknown;
  onRefresh: () => void;
  onRunAnalysis: () => void;
  onApplyDrawings: () => void;
  onClearDrawings: () => void;
  onApplyIndicators: () => void;
  isOverlaysActive: boolean;
  onClose: () => void;
}

export function AiChartSidebar({
  symbol,
  resolution,
  analysis,
  isLoading,
  isRefreshing,
  isError,
  error,
  onRefresh,
  onRunAnalysis,
  onApplyDrawings,
  onClearDrawings,
  onApplyIndicators,
  isOverlaysActive,
  onClose,
}: AiChartSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    playbook: true,
    structure: true,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const theme =
    analysis?.stance && STANCE_THEMES[analysis.stance]
      ? STANCE_THEMES[analysis.stance]
      : STANCE_THEMES.BULLISH;

  const timeInfo = analysis?.evaluated_at
    ? formatAiTimestamp(analysis.evaluated_at)
    : null;

  return (
    <aside
      className="w-full sm:w-[380px] lg:w-[420px] xl:w-[450px] shrink-0 border-l border-border bg-card/95 backdrop-blur-md h-full flex flex-col z-30 select-none overflow-hidden transition-all duration-300 shadow-xl"
      aria-label="AI Technical Analysis Sidebar"
    >
      {/* 1. Header (Sticky) */}
      <div className="shrink-0 border-b border-border/80 px-4 py-3 flex items-center justify-between gap-2 bg-card">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent text-background shadow-xs font-bold text-sm">
            ✨
          </span>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs tracking-tight text-foreground truncate">
                AI Technical Analysis
              </span>
              <span className="rounded bg-accent/15 text-accent border border-accent/30 px-1.5 py-0.2 text-[9px] font-extrabold uppercase">
                AGY CMT
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              {symbol ? `${symbol} · ${resolution}` : "Select Symbol"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {analysis && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh AI Technical Scan"
              aria-label="Refresh AI Technical Scan"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isRefreshing ? "animate-spin" : ""}
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            title="Hide AI Panel"
            aria-label="Hide AI Panel"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 2. Subheader Action Bar (Sticky) */}
      {analysis && (
        <div className="shrink-0 border-b border-border/70 px-4 py-2 bg-muted/20 flex flex-wrap items-center justify-between gap-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${theme.badge}`}>
              {analysis.stance}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {analysis.confidence_score}% Conf.
            </span>
          </div>

          <div className="flex items-center gap-1">
            {isOverlaysActive ? (
              <button
                type="button"
                onClick={onClearDrawings}
                className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors"
                title="Remove automated trendlines and pivots from chart canvas"
              >
                ✕ Clear Lines
              </button>
            ) : (
              <button
                type="button"
                onClick={onApplyDrawings}
                className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
                title="Draw support/resistance and trendlines directly onto chart"
              >
                <span>✨</span> Draw Overlays
              </button>
            )}

            <button
              type="button"
              onClick={onApplyIndicators}
              className="rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted transition-colors flex items-center gap-1"
              title="Apply AI recommended indicators to chart"
            >
              <span>📊</span> Indicators
            </button>
          </div>
        </div>
      )}

      {/* 3. Scrollable Sidebar Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3.5 [scrollbar-width:thin]">
        {/* Loading state */}
        {isLoading && (
          <div className="rounded-xl border border-primary/30 bg-card/80 p-4 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <span className="flex h-2.5 w-2.5 rounded-full bg-primary animate-ping" />
              <span>Scanning Price Action with AGY CMT Engine…</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Extracting candlestick swings, calculating indicators, and formulating trade playbook for {symbol} ({resolution}).
            </p>
            <div className="space-y-2 pt-1">
              <div className="h-14 animate-pulse rounded-lg bg-muted/50" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-12 animate-pulse rounded-lg bg-muted/40" />
                <div className="h-12 animate-pulse rounded-lg bg-muted/40" />
              </div>
              <div className="h-20 animate-pulse rounded-lg bg-muted/30" />
            </div>
          </div>
        )}

        {/* Error state */}
        {!isLoading && isError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs space-y-2">
            <div className="flex items-center justify-between text-red-700 dark:text-red-400 font-bold">
              <span>Analysis Scan Failed</span>
              <button
                type="button"
                onClick={onRunAnalysis}
                className="rounded border border-red-500/40 px-2 py-0.5 text-[11px] hover:bg-red-500/20"
              >
                Retry
              </button>
            </div>
            <p className="text-muted-foreground text-[11px]">
              {error ? String(error) : "Could not complete chart evaluation for this symbol."}
            </p>
          </div>
        )}

        {/* Empty state (Not yet analyzed) */}
        {!isLoading && !isError && !analysis && (
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/10 p-6 text-center space-y-3">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary text-xl">
              📈
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Clean Chart Mode Active</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Run AGY AI Technical Analysis to generate swing levels, targets, confluence scoring, and an in-depth CMT research article for <strong>{symbol}</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={onRunAnalysis}
              className="w-full rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <span>✨</span> Run AI Technical Scan
            </button>
          </div>
        )}

        {/* Full Analysis Content */}
        {!isLoading && analysis && (
          <>
            {/* Updating banner if background refresh in progress */}
            {isRefreshing && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 p-2 text-[11px] font-medium text-foreground">
                <span className="flex h-2 w-2 rounded-full bg-primary animate-ping shrink-0" />
                <span className="truncate">Refreshing technical scan… keeping previous data visible.</span>
              </div>
            )}

            {/* Title & Executive Summary */}
            <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2 shadow-2xs">
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold tracking-tight text-foreground leading-snug">
                  {analysis.title}
                </h3>
                {timeInfo && (
                  <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5">
                    <span>Generated {timeInfo.relative}</span>
                    <span>·</span>
                    <span>{timeInfo.formatted}</span>
                  </div>
                )}
              </div>

              {analysis.article.executive_summary && (
                <p className="rounded-lg border-l-3 border-primary bg-primary/5 p-2.5 text-xs leading-relaxed text-foreground">
                  {analysis.article.executive_summary}
                </p>
              )}
            </div>

            {/* Trade Setup 2x2 Matrix */}
            <div className="grid grid-cols-2 gap-2">
              {/* Buy Zone */}
              <div className="rounded-xl border border-border/70 bg-card p-2.5 space-y-0.5 shadow-2xs">
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Action / Buy Band</span>
                  <span className="text-primary font-mono font-extrabold">{analysis.action}</span>
                </div>
                <div className="font-mono text-xs font-extrabold text-foreground">
                  NPR {analysis.entry_zone.min} – {analysis.entry_zone.max}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">Pullback accumulation</p>
              </div>

              {/* Invalidation / Stop Loss */}
              <div className="rounded-xl border border-border/70 bg-card p-2.5 space-y-0.5 shadow-2xs">
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Stop Loss</span>
                  <span className="text-primary font-mono font-bold">R:R {analysis.risk_reward_ratio}</span>
                </div>
                <div className="font-mono text-xs font-extrabold text-rose-600 dark:text-rose-400">
                  NPR {analysis.stop_loss.price}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">Structural exit floor</p>
              </div>

              {/* Target 1 */}
              <div className="rounded-xl border border-border/70 bg-card p-2.5 space-y-0.5 shadow-2xs">
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Target 1 (T1)</span>
                  {analysis.targets[0]?.upside_pct && (
                    <span className="text-emerald-600 font-bold text-[9px]">+{analysis.targets[0].upside_pct}%</span>
                  )}
                </div>
                <div className="font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                  NPR {analysis.targets[0]?.price ?? "—"}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{analysis.targets[0]?.label ?? "Intermediate supply"}</p>
              </div>

              {/* Target 2 */}
              <div className="rounded-xl border border-border/70 bg-card p-2.5 space-y-0.5 shadow-2xs">
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Target 2 (T2)</span>
                  {analysis.targets[1]?.upside_pct && (
                    <span className="text-emerald-600 font-bold text-[9px]">+{analysis.targets[1].upside_pct}%</span>
                  )}
                </div>
                <div className="font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                  NPR {analysis.targets[1]?.price ?? "—"}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{analysis.targets[1]?.label ?? "Major extension"}</p>
              </div>
            </div>

            {/* Quant Scorecard & Key Levels Ladder */}
            {analysis.quant && <SidebarQuantPanels q={analysis.quant} />}

            {/* Tools Plotted on Chart Badges */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span>Tools in Toolkit:</span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  {analysis.recommended_drawings.length} overlays · {analysis.recommended_indicators.length} indicators
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {analysis.recommended_drawings.map((d, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-card px-2 py-0.5 text-[10px] font-medium"
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: d.color || "#3b82f6" }} />
                    <span className="truncate max-w-[120px]">{d.label}</span>
                  </span>
                ))}
                {analysis.recommended_indicators.map((ind, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-card px-2 py-0.5 text-[10px] font-medium uppercase"
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ind.color }} />
                    <span>{ind.type} {ind.period}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Structured Research Sections */}
            <div className="space-y-2 pt-1">
              {(
                [
                  ["playbook", "Execution Playbook", analysis.article.what_to_do],
                  ["structure", "Market Structure & Levels", analysis.article.market_structure],
                  ["momentum", "Momentum & Volatility", analysis.article.momentum_volatility],
                  ["volume", "Volume & Order Flow", analysis.article.volume_analysis],
                  ["multi", "Multi-Timeframe Context", analysis.article.multi_timeframe],
                  ["why", "Why This Toolkit", analysis.article.why_tools_used],
                ] as const
              ).map(([key, label, text]) => {
                if (!text) return null;
                const isExpanded = expandedSections[key];
                return (
                  <div key={key} className="rounded-xl border border-border/70 bg-card overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleSection(key)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-foreground hover:bg-muted/40 transition-colors cursor-pointer text-left"
                    >
                      <span>{label}</span>
                      <span className="text-muted-foreground text-[10px]">{isExpanded ? "▲" : "▼"}</span>
                    </button>
                    {isExpanded && (
                      <div className="px-3.5 pb-3 text-xs text-muted-foreground leading-relaxed whitespace-pre-line border-t border-border/40 pt-2">
                        {text}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Risk Factors */}
              {analysis.article.risk_factors?.length > 0 && (
                <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-3 text-xs space-y-1.5">
                  <div className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                    <span>⚠️</span> Thesis Invalidation & Risks
                  </div>
                  <ul className="space-y-1 text-muted-foreground pl-1 text-[11px]">
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
          </>
        )}
      </div>
    </aside>
  );
}

function SidebarQuantPanels({ q }: { q: ChartQuant }) {
  const scorePos = Math.max(0, Math.min(100, (q.score + 100) / 2));
  const p = q.plan;

  return (
    <div className="space-y-3">
      {/* Confluence Scorecard */}
      <div className="rounded-xl border border-border/70 bg-card p-3 space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">Confluence Score</span>
          <span className={`font-mono text-xs font-extrabold ${biasColor(q.score)}`}>
            {q.score > 0 ? "+" : ""}{q.score} / 100
          </span>
        </div>
        <div className="relative h-2 rounded-full bg-gradient-to-r from-rose-500/70 via-muted to-emerald-500/70">
          <div
            className="absolute -top-1 h-4 w-1.5 rounded-full bg-foreground shadow-xs"
            style={{ left: `calc(${scorePos}% - 3px)` }}
          />
        </div>
        <ul className="space-y-1">
          {q.signals.slice(0, 4).map((s) => (
            <li key={s.name} className="flex items-start gap-1.5 text-[11px] leading-tight">
              <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${biasDot(s.bias)}`} />
              <span className="w-28 shrink-0 font-semibold text-foreground truncate">{s.name}</span>
              <span className="text-muted-foreground truncate">{s.detail}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Key Levels Ladder */}
      <div className="rounded-xl border border-border/70 bg-card p-3 space-y-2 shadow-2xs">
        <span className="text-xs font-bold uppercase tracking-wider text-foreground">Key Levels Ladder</span>
        <ul className="space-y-1 font-mono text-xs">
          {q.levels.filter((l) => l.kind === "resistance").slice(0, 2).map((l) => (
            <li key={l.price} className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-[11px]">
              <span>R {l.price}</span>
              <span className="text-muted-foreground text-[10px]">+{Math.abs(l.distance_pct)}%</span>
            </li>
          ))}
          <li className="flex items-center justify-between rounded bg-primary/10 px-1.5 py-0.5 font-extrabold text-primary text-[11px]">
            <span>▶ Price {q.last_close}</span>
            <span className="text-[10px]">POC {q.volume.poc}</span>
          </li>
          {q.levels.filter((l) => l.kind === "support").slice(0, 2).map((l) => (
            <li key={l.price} className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-[11px]">
              <span>S {l.price}</span>
              <span className="text-muted-foreground text-[10px]">−{Math.abs(l.distance_pct)}%</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Compact 2x3 Quant Metrics */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-lg border border-border/60 bg-card p-2 space-y-0.5">
          <div className="text-[9px] font-bold uppercase text-muted-foreground">Regime</div>
          <div className="font-mono text-xs font-extrabold text-foreground">{q.regime.label}</div>
          <div className="text-[10px] text-muted-foreground">ADX {q.regime.adx}</div>
        </div>
        <div className="rounded-lg border border-border/60 bg-card p-2 space-y-0.5">
          <div className="text-[9px] font-bold uppercase text-muted-foreground">Momentum</div>
          <div className="font-mono text-xs font-extrabold text-foreground">RSI {q.momentum.rsi}</div>
          <div className="text-[10px] text-muted-foreground truncate">{q.momentum.macd_state}</div>
        </div>
        <div className="rounded-lg border border-border/60 bg-card p-2 space-y-0.5">
          <div className="text-[9px] font-bold uppercase text-muted-foreground">Volatility</div>
          <div className="font-mono text-xs font-extrabold text-foreground">ATR {q.volatility.atr}</div>
          <div className="text-[10px] text-muted-foreground truncate">{q.volatility.squeeze ? "⚡ SQUEEZE" : `${q.volatility.atr_pct}%`}</div>
        </div>
        <div className="rounded-lg border border-border/60 bg-card p-2 space-y-0.5">
          <div className="text-[9px] font-bold uppercase text-muted-foreground">Volume</div>
          <div className="font-mono text-xs font-extrabold text-foreground">{q.volume.rel_vol}× avg</div>
          <div className="text-[10px] text-muted-foreground truncate">{q.volume.obv_trend}</div>
        </div>
      </div>

      {/* Trade math summary */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-[11px] font-mono flex items-center justify-between text-muted-foreground">
        <span>Risk: <strong className="text-foreground">{p.risk_pct}% / share</strong></span>
        <span>R:R: <strong className="text-foreground">{p.rr[0]} / {p.rr[1]}</strong></span>
      </div>
    </div>
  );
}
