"use client";

import { useState } from "react";
import { formatAiTimestamp } from "@/features/ai";
import type { NewsBriefing } from "../types";

interface Props {
  briefing: NewsBriefing | undefined;
  isLoading: boolean;
  onRefresh?: () => void;
}

export function NewsAiBriefing({ briefing, isLoading, onRefresh }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (isLoading && !briefing) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-xs animate-pulse space-y-3">
        <div className="h-5 w-48 bg-primary/20 rounded-md" />
        <div className="h-4 w-full bg-primary/10 rounded-md" />
        <div className="h-4 w-3/4 bg-primary/10 rounded-md" />
      </div>
    );
  }

  if (!briefing) return null;

  const isBull = briefing.market_stance === "BULLISH";
  const isBear = briefing.market_stance === "BEARISH";
  const timeInfo = formatAiTimestamp(briefing.generated_at);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6 shadow-xs transition-all space-y-3">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30 text-base shadow-2xs">
            🤖
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                AI Regulatory & Market Pulse
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                  isBull
                    ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                    : isBear
                    ? "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                    : "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                }`}
              >
                {briefing.market_stance}
              </span>
            </div>
            <p className="text-xs text-muted-foreground pt-0.5">
              Live algorithmic synthesis of SEBON circulars, NRB monetary directives, and corporate earnings
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Timestamp Badge */}
          {briefing.generated_at && (
            <div
              className="flex items-center gap-1.5 rounded-lg bg-muted/60 border border-border/70 px-2.5 py-1 text-[11px] font-mono text-muted-foreground"
              title={`Generated at: ${timeInfo.formatted}`}
            >
              <span className="text-primary font-bold">🕒 AI Generated:</span>
              <span className="text-foreground font-semibold">{timeInfo.formatted}</span>
              <span className="text-primary font-medium">({timeInfo.relative})</span>
            </div>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="rounded-lg border px-2.5 py-1 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh AI briefing"
            >
              {isLoading ? "Refreshing…" : "Refresh"}
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg border px-2.5 py-1 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
          >
            {isExpanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      {/* Active Refresh Banner */}
      {isLoading && (
        <div className="flex items-center gap-2.5 rounded-xl border border-primary/40 bg-primary/10 p-2.5 text-xs font-medium text-foreground animate-in fade-in duration-200">
          <span className="flex h-2.5 w-2.5 rounded-full bg-primary animate-ping shrink-0" />
          <span>
            <strong>Synthesizing latest regulatory directives…</strong> Showing previously generated pulse ({timeInfo.formatted}) until complete.
          </span>
        </div>
      )}

      {isExpanded && (
        <div className="mt-4 pt-4 border-t space-y-4">
          {/* Key Headline & Summary */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-1">{briefing.headline}</h3>
            <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed">{briefing.summary}</p>
          </div>

          {/* Regulatory Takeaway */}
          <div className="rounded-xl border bg-muted/40 p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">⚖️</span>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Regulatory Takeaway (SEBON & NRB)
              </span>
            </div>
            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium">
              {briefing.regulatory_takeaway}
            </p>
          </div>

          {/* Opportunities and Risks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-emerald-500/5 border-emerald-500/20 p-3.5">
              <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>🎯</span> Top Catalysts / Buy Opportunities
              </h4>
              <ul className="space-y-1.5 text-xs text-foreground/85">
                {briefing.top_opportunities.map((opp, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold shrink-0 mt-0.5">&bull;</span>
                    <span>{opp}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border bg-rose-500/5 border-rose-500/20 p-3.5">
              <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>⚠️</span> Risks & Cautions to Watch
              </h4>
              <ul className="space-y-1.5 text-xs text-foreground/85">
                {briefing.top_risks.map((risk, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-rose-500 font-bold shrink-0 mt-0.5">&bull;</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sector Playbook */}
          {briefing.sector_outlook && Object.keys(briefing.sector_outlook).length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Sector Playbook
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {Object.entries(briefing.sector_outlook).map(([sector, outlook]) => (
                  <div key={sector} className="rounded-lg border bg-card p-2.5 text-xs">
                    <span className="font-bold text-foreground block mb-0.5">{sector}</span>
                    <span className="text-[11px] text-muted-foreground leading-snug">{outlook}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
