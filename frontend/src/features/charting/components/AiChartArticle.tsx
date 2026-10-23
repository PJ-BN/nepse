"use client";

import type { ChartAiAnalysis, ChartQuant } from "@/features/ai/types";

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

      {analysis.article.executive_summary && (
        <p className="rounded-lg border-l-4 border-primary bg-primary/5 px-4 py-3 text-sm leading-relaxed text-foreground">
          {analysis.article.executive_summary}
        </p>
      )}

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

      {analysis.quant && <QuantPanels q={analysis.quant} />}

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
        {(
          [
            ["Market Structure & Key Levels", analysis.article.market_structure],
            ["Momentum & Volatility", analysis.article.momentum_volatility],
            ["Volume & Order Flow", analysis.article.volume_analysis],
            ["Multi-Timeframe Context", analysis.article.multi_timeframe],
            ["Why This Toolkit", analysis.article.why_tools_used],
            analysis.article.executive_summary ? null : ["What The Chart Says", analysis.article.what_chart_says],
            ["Execution Playbook (Entry · Scaling · Stop · Sizing)", analysis.article.what_to_do],
          ] as Array<[string, string | undefined] | null>
        ).map((s, i) =>
          s && s[1] ? (
            <section key={i} className="rounded-xl border border-border/70 bg-card p-4 space-y-2">
              <h3 className="text-sm font-bold text-foreground">{s[0]}</h3>
              <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{s[1]}</div>
            </section>
          ) : null
        )}

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

const biasColor = (b: number) => (b > 0 ? "text-emerald-600 dark:text-emerald-400" : b < 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground");
const biasDot = (b: number) => (b > 0 ? "bg-emerald-500" : b < 0 ? "bg-rose-500" : "bg-muted-foreground/50");

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3 space-y-0.5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-mono text-sm font-extrabold text-foreground">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground leading-snug">{sub}</div>}
    </div>
  );
}

function QuantPanels({ q }: { q: ChartQuant }) {
  const scorePos = (q.score + 100) / 2;
  const p = q.plan;
  return (
    <div className="space-y-3">
      {/* Confluence scorecard + key levels */}
      <div className="grid gap-3 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-xl border border-border/70 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Confluence Scorecard</span>
            <span className={`font-mono text-sm font-extrabold ${biasColor(q.score)}`}>
              {q.score > 0 ? "+" : ""}{q.score} / 100
            </span>
          </div>
          <div className="relative h-2 rounded-full bg-gradient-to-r from-rose-500/70 via-muted to-emerald-500/70">
            <div className="absolute -top-1 h-4 w-1 rounded bg-foreground" style={{ left: `calc(${scorePos}% - 2px)` }} />
          </div>
          <ul className="space-y-1.5">
            {q.signals.map((s) => (
              <li key={s.name} className="flex items-start gap-2 text-[11px] leading-snug">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${biasDot(s.bias)}`} />
                <span className="w-36 shrink-0 font-semibold text-foreground">{s.name}</span>
                <span className="text-muted-foreground">{s.detail}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-border/70 bg-card p-4 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">Key Levels Ladder</span>
          <ul className="space-y-1 font-mono text-xs">
            {q.levels.filter((l) => l.kind === "resistance").map((l) => (
              <li key={l.price} className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                <span>R {l.price}</span>
                <span className="text-muted-foreground">{l.touches}× · {"★".repeat(l.strength)} · +{Math.abs(l.distance_pct)}%</span>
              </li>
            ))}
            <li className="flex items-center justify-between rounded bg-primary/10 px-1.5 py-1 font-extrabold text-primary">
              <span>▶ Price {q.last_close}</span>
              <span className="text-[10px]">POC {q.volume.poc} · VA {q.volume.va_low}–{q.volume.va_high}</span>
            </li>
            {q.levels.filter((l) => l.kind === "support").map((l) => (
              <li key={l.price} className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span>S {l.price}</span>
                <span className="text-muted-foreground">{l.touches}× · {"★".repeat(l.strength)} · −{Math.abs(l.distance_pct)}%</span>
              </li>
            ))}
          </ul>
          {q.fib && (
            <p className="border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
              Fib ({q.fib.direction === "UP" ? "up-leg" : "down-leg"} {q.fib.swing_low}–{q.fib.swing_high}):{" "}
              {q.fib.levels.map((f) => `${Math.round(f.ratio * 1000) / 10}% ${f.price}`).join(" · ")} · ext 127% {q.fib.ext_1272} · 162% {q.fib.ext_1618}
            </p>
          )}
        </div>
      </div>

      {/* Regime / momentum / volatility / volume / range stats */}
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Regime" value={q.regime.label} sub={`ADX ${q.regime.adx} · +DI ${q.regime.plus_di} / −DI ${q.regime.minus_di}`} />
        <Stat label="Structure" value={q.structure.bias} sub={q.structure.sequence} />
        <Stat label="Momentum" value={`RSI ${q.momentum.rsi}`} sub={`MACD ${q.momentum.macd_state} · Stoch ${q.momentum.stoch_k}`} />
        <Stat label="Volatility" value={`ATR ${q.volatility.atr} (${q.volatility.atr_pct}%)`} sub={`BB width ${q.volatility.bb_width_pctile}th pct${q.volatility.squeeze ? " · SQUEEZE" : ""} · 20-bar σ ±${q.volatility.exp_move_20d_pct}%`} />
        <Stat label="Volume" value={`${q.volume.rel_vol}× avg`} sub={q.volume.obv_trend} />
        <Stat label="52W Range" value={`${q.range.pos_pct}% of range`} sub={`${q.range.low_52w} – ${q.range.high_52w} (${q.range.from_high_pct}% from high)`} />
      </div>

      {/* Multi-timeframe + candle evidence */}
      {(q.mtf.length > 0 || q.patterns.length > 0) && (
        <div className="flex flex-wrap gap-2 text-[11px]">
          {q.mtf.map((m) => (
            <span key={m.tf} className="rounded-full border border-border/70 bg-background px-3 py-1 font-semibold">
              {m.tf}: <span className={biasColor(m.trend === "UP" ? 1 : m.trend === "DOWN" ? -1 : 0)}>{m.trend}</span> · RSI {m.rsi}
            </span>
          ))}
          {q.patterns.map((pt, i) => (
            <span key={i} className="rounded-full border border-border/70 bg-background px-3 py-1">
              <span className={biasColor(pt.bias)}>●</span> {pt.name} <span className="text-muted-foreground">{pt.date}</span>
            </span>
          ))}
        </div>
      )}

      {/* Scenarios + trade math */}
      <div className="grid gap-3 lg:grid-cols-4">
        {q.scenarios.map((s, i) => (
          <div key={s.name} className="rounded-xl border border-border/70 bg-card p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <span className="truncate">{s.name}</span>
              <span className={`font-mono ${i === 0 ? "text-emerald-600" : i === 2 ? "text-rose-600" : "text-primary"}`}>{s.probability}%</span>
            </div>
            <div className="h-1.5 rounded bg-muted">
              <div className={`h-1.5 rounded ${i === 0 ? "bg-emerald-500" : i === 2 ? "bg-rose-500" : "bg-primary"}`} style={{ width: `${s.probability}%` }} />
            </div>
            <div className="font-mono text-sm font-extrabold text-foreground">→ NPR {s.target}</div>
            <p className="text-[11px] text-muted-foreground leading-snug">{s.trigger}</p>
          </div>
        ))}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Trade Math</div>
          <div className="font-mono text-xs text-foreground">T3 NPR {p.targets[2]} ({p.rr[2]}R)</div>
          <div className="font-mono text-xs text-foreground">R:R {p.rr[0]} / {p.rr[1]} / {p.rr[2]}</div>
          <div className="font-mono text-xs text-foreground">Risk {p.risk_pct}% per share</div>
          <div className="font-mono text-xs text-foreground">NPR 10k risk ≈ {p.shares_per_10k_risk.toLocaleString()} sh</div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Scenario probabilities are model estimates derived from the confluence score, not forecasts. Not investment advice.
      </p>
    </div>
  );
}
