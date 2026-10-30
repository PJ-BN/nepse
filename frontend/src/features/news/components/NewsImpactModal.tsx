"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatAiTimestamp } from "@/features/ai";
import { useAuth } from "@/features/auth";
import type { NewsAiEvaluation, NewsItem } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  newsItem: NewsItem | null;
  aiData: NewsAiEvaluation | null;
  isLoading: boolean;
  onReanalyze?: () => void;
}

export function NewsImpactModal({ isOpen, onClose, newsItem, aiData, isLoading, onReanalyze }: Props) {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !newsItem || !mounted) return null;

  const stance = aiData?.impact_stance || newsItem.impact_stance;
  const score = aiData?.impact_score ?? newsItem.impact_score;
  const rec = aiData?.action_recommendation || newsItem.action_recommendation;
  const playbook = aiData?.actionable_playbook || newsItem.action_detail;

  const isBull = stance === "BULLISH";
  const isBear = stance === "BEARISH";
  const timeInfo = formatAiTimestamp(aiData?.analyzed_at || newsItem.created_at);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border bg-card p-6 shadow-2xl transition-all sm:p-7">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b pb-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                  isBull
                    ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                    : isBear
                    ? "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                    : "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                }`}
              >
                {stance} {score !== 0 ? `(${score > 0 ? "+" : ""}${score})` : ""}
              </span>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground uppercase">
                {newsItem.category}
              </span>
              <span className="text-xs text-muted-foreground">{newsItem.source}</span>
            </div>

            <h3 className="text-lg font-bold text-foreground leading-snug pt-1">{newsItem.title}</h3>

            {/* Timestamp Badge */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground pt-1">
              <span className="text-primary font-bold">🕒 AI Generated:</span>
              <span className="text-foreground font-semibold">{timeInfo.formatted}</span>
              <span className="text-primary font-medium">({timeInfo.relative})</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onReanalyze && (
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    openAuthModal("login");
                    return;
                  }
                  onReanalyze();
                }}
                disabled={isLoading}
                className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
                title={isAuthenticated ? "Re-run deep impact analysis with AGY" : "Sign in to re-analyze"}
              >
                <span className={isLoading ? "animate-spin" : ""}>🔄</span>
                <span className="hidden sm:inline">{isLoading ? "Analyzing…" : "Re-analyze"}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Active Refresh Banner (keeps previous data displayed while refreshing!) */}
        {isLoading && aiData && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-primary/40 bg-primary/10 p-2.5 text-xs font-medium text-foreground animate-in fade-in duration-200">
            <span className="flex h-2.5 w-2.5 rounded-full bg-primary animate-ping shrink-0" />
            <span>
              <strong>Re-analyzing news impact with AGY…</strong> Showing previous analysis ({timeInfo.formatted}) until complete.
            </span>
          </div>
        )}

        {/* Content Body */}
        <div className="space-y-6 pt-5">
          {isLoading && !aiData ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm font-medium text-muted-foreground">Running AI Investment Impact Engine…</p>
            </div>
          ) : (
            <>
              {/* Action Box: What Should I Do? */}
              <div
                className={`rounded-xl border p-4 sm:p-5 ${
                  isBull
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : isBear
                    ? "bg-rose-500/10 border-rose-500/30"
                    : "bg-amber-500/10 border-amber-500/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🎯</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Action Verdict &bull; What Should You Do?
                  </span>
                </div>
                <div className="text-base font-bold text-foreground mb-1.5">{rec}</div>
                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">{playbook}</p>

                <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-foreground/10 text-xs">
                  <div>
                    <span className="text-muted-foreground">Target Horizon: </span>
                    <span className="font-semibold">{aiData?.target_horizon || newsItem.time_horizon}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Confidence: </span>
                    <span className="font-semibold">{newsItem.confidence}%</span>
                  </div>
                  {aiData?.source && (
                    <div>
                      <span className="text-muted-foreground">Analysis: </span>
                      <span className="font-semibold uppercase">{aiData.source} Engine</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Mentioned Symbols & Sectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border bg-muted/20 p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Affected Symbols
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(aiData?.affected_symbols?.length ? aiData.affected_symbols : newsItem.symbols).length > 0 ? (
                      (aiData?.affected_symbols?.length ? aiData.affected_symbols : newsItem.symbols).map((sym) => (
                        <a
                          key={sym}
                          href={`/company/${sym}`}
                          className="rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-2.5 py-1 text-xs font-bold transition-colors"
                        >
                          {sym} &rarr;
                        </a>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Market-wide / Sector level impact</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/20 p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Affected Sector
                  </h4>
                  <span className="inline-block rounded-lg bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                    {newsItem.sector || "General NEPSE Market"}
                  </span>
                </div>
              </div>

              {/* Checklist */}
              {aiData?.investor_checklist && aiData.investor_checklist.length > 0 && (
                <div className="rounded-xl border bg-card p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <span>📋</span> Investor Action Checklist
                  </h4>
                  <ul className="space-y-2">
                    {aiData.investor_checklist.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-foreground/90">
                        <span className="text-emerald-500 font-bold shrink-0 mt-0.5">&#10003;</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Catalysts & Risks */}
              {aiData?.catalysts && aiData.catalysts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border bg-emerald-500/5 border-emerald-500/20 p-4">
                    <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <span>🚀</span> Key Catalysts
                    </h4>
                    <ul className="space-y-1.5 text-xs text-foreground/85">
                      {aiData.catalysts.map((cat, i) => (
                        <li key={i}>&bull; {cat}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border bg-rose-500/5 border-rose-500/20 p-4">
                    <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <span>⚠️</span> Risks to Monitor
                    </h4>
                    <ul className="space-y-1.5 text-xs text-foreground/85">
                      {(aiData.risks_to_watch || ["Market turnover liquidity", "Regulatory policy shifts"]).map(
                        (risk, i) => (
                          <li key={i}>&bull; {risk}</li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {/* Original Article Link */}
              <div className="flex items-center justify-between border-t pt-4 text-xs">
                <span className="text-muted-foreground">Published: {newsItem.published_on}</span>
                <a
                  href={newsItem.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  Read original source ({newsItem.source}) &nearr;
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
