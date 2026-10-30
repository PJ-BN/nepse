"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/features/auth";
import type { NewsAiEvaluation, NewsItem } from "../types";
import { NewsImpactModal } from "./NewsImpactModal";

interface Props {
  news: NewsItem;
  onSelectSymbol?: (symbol: string) => void;
  onAnalyze?: (item: NewsItem, forceRefresh?: boolean) => Promise<NewsAiEvaluation>;
}

export function NewsCard({ news, onSelectSymbol, onAnalyze }: Props) {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [aiData, setAiData] = useState<NewsAiEvaluation | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const isBull = news.impact_stance === "BULLISH";
  const isBear = news.impact_stance === "BEARISH";

  const handleOpenDeepDive = async () => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    setModalOpen(true);
    if (!aiData && onAnalyze) {
      setAnalyzing(true);
      try {
        const result = await onAnalyze(news, false);
        setAiData(result);
      } catch (err) {
        console.error("Deep dive error:", err);
      } finally {
        setAnalyzing(false);
      }
    }
  };

  const handleReanalyze = async () => {
    if (!onAnalyze) return;
    setAnalyzing(true);
    try {
      const result = await onAnalyze(news, true);
      setAiData(result);
    } catch (err) {
      console.error("Re-analyze error:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "regulatory":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25";
      case "government":
        return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/25";
      case "company":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25";
      case "macro":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <>
      <article className="group relative flex flex-col justify-between rounded-2xl border bg-card p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 hover:border-primary/40">
        <div className="space-y-3">
          {/* Top metadata row */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-full border px-2.5 py-0.5 font-bold uppercase tracking-wider text-[11px] ${getCategoryColor(
                  news.category
                )}`}
              >
                {news.category}
              </span>
              <span className="rounded-md bg-muted/60 px-2 py-0.5 font-medium text-muted-foreground">
                {news.source}
              </span>
            </div>

            <time dateTime={news.published_on} className="text-muted-foreground tabular-nums">
              {news.published_on}
            </time>
          </div>

          {/* Headline */}
          <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
            <a href={news.source_url} target="_blank" rel="noreferrer" className="hover:underline">
              {news.title}
            </a>
          </h3>

          {/* Mentioned Symbols */}
          {news.symbols && news.symbols.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Tagged Stocks:
              </span>
              {news.symbols.map((sym) => (
                <div key={sym} className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSelectSymbol?.(sym)}
                    className="rounded-md bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 px-2 py-0.5 text-xs font-bold transition-colors cursor-pointer"
                    title={`Filter news for ${sym}`}
                  >
                    {sym}
                  </button>
                  <Link
                    href={`/company/${sym}`}
                    className="text-[10px] text-muted-foreground hover:text-foreground underline"
                    title={`Open company profile for ${sym}`}
                  >
                    profile
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {news.summary}
          </p>
        </div>

        {/* AI Action Box: What Should I Do? */}
        <div className="mt-4 pt-3.5 border-t space-y-3">
          <div
            className={`rounded-xl border p-3 sm:p-3.5 ${
              isBull
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100"
                : isBear
                ? "bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100"
                : "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                <span>{isBull ? "🚀" : isBear ? "⚠️" : "💡"}</span>
                <span>WHAT SHOULD I DO?</span>
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                  isBull
                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                    : isBear
                    ? "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                    : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                }`}
              >
                {news.impact_stance}
              </span>
            </div>

            <div className="text-xs sm:text-sm font-bold leading-tight mb-1 text-foreground">
              {news.action_recommendation}
            </div>

            <p className="text-xs text-foreground/85 line-clamp-2 leading-relaxed">
              {news.action_detail}
            </p>

            <div className="flex items-center justify-between pt-2 mt-2 border-t border-foreground/10 text-[11px] text-muted-foreground">
              <span>Horizon: <strong className="text-foreground">{news.time_horizon}</strong></span>
              <span>Confidence: <strong className="text-foreground">{news.confidence}%</strong></span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1">
            <a
              href={news.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              Source article &nearr;
            </a>

            <button
              type="button"
              onClick={handleOpenDeepDive}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 px-3 py-1.5 text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              title={isAuthenticated ? "AI Deep-Dive" : "Sign in to unlock AI Deep-Dive"}
            >
              <span>{isAuthenticated ? "🤖" : "🔒"}</span>
              <span>AI Deep-Dive</span>
            </button>
          </div>
        </div>
      </article>

      {/* Modal */}
      <NewsImpactModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        newsItem={news}
        aiData={aiData}
        isLoading={analyzing}
        onReanalyze={handleReanalyze}
      />
    </>
  );
}
