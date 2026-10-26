"use client";

import { useState } from "react";
import Link from "next/link";
import type { StockAgentEvaluation } from "@/features/ai/agentTypes";

type StockCardProps = {
  stock: StockAgentEvaluation;
  isWatchlisted: boolean;
  onToggleWatchlist: (symbol: string) => void;
  compact?: boolean;
};

export function StockCard({ stock, isWatchlisted, onToggleWatchlist, compact = false }: StockCardProps) {
  const [showPlan, setShowPlan] = useState(stock.action === "BUY");

  const isBuy = stock.action === "BUY";
  const isWatch = stock.action === "WATCHLIST";

  // Action badge styling
  const actionBadge = isBuy
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
    : isWatch
    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
    : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";

  const actionText = isBuy ? "BUY SIGNAL" : isWatch ? "WATCHLIST" : "SELL / AVOID";
  const actionIcon = isBuy ? "🚀" : isWatch ? "👁️" : "⚠️";

  // Confluence score color
  const scoreColor =
    stock.confidenceScore >= 75
      ? "text-emerald-600 dark:text-emerald-400"
      : stock.confidenceScore >= 50
      ? "text-amber-600 dark:text-amber-400"
      : "text-rose-600 dark:text-rose-400";

  return (
    <article
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-200 hover:shadow-md ${
        isWatchlisted
          ? "border-amber-400/50 bg-gradient-to-b from-amber-500/5 via-card to-card"
          : "border-border/70 bg-card hover:border-border"
      } ${compact ? "p-4" : "p-5"}`}
    >
      <div>
        {/* Top Header: Symbol, Name, Sector & Watchlist Star */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/company/${stock.symbol}`}
                className="font-mono text-lg font-bold tracking-tight text-foreground hover:text-primary hover:underline"
              >
                {stock.symbol}
              </Link>
              <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {stock.sector}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase ${actionBadge}`}
              >
                <span>{actionIcon}</span>
                <span>{actionText}</span>
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground" title={stock.name}>
              {stock.name}
            </p>
          </div>

          {/* Star Button */}
          <button
            onClick={() => onToggleWatchlist(stock.symbol)}
            title={isWatchlisted ? "Remove from personal watchlist" : "Add to personal watchlist"}
            aria-label={isWatchlisted ? `Remove ${stock.symbol} from watchlist` : `Add ${stock.symbol} to watchlist`}
            className={`shrink-0 rounded-xl p-2 transition-all duration-150 ${
              isWatchlisted
                ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 scale-105"
                : "text-muted-foreground/60 hover:bg-muted hover:text-foreground"
            }`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={isWatchlisted ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        </div>

        {/* Price & Confluence Score */}
        <div className="mt-4 flex items-end justify-between border-b border-border/50 pb-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                NPR {(stock.close ?? 0).toLocaleString()}
              </span>
              <span
                className={`font-mono text-xs font-semibold ${
                  (stock.changePct ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {(stock.changePct ?? 0) >= 0 ? "+" : ""}
                {(stock.changePct ?? 0).toFixed(2)}%
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Vol: {(stock.volume ?? 0).toLocaleString()} shares • Turnover: NPR {(((stock.turnover ?? 0) / 10000000)).toFixed(2)} Cr
            </p>
          </div>

          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Confluence</span>
              <span className={`font-mono text-base font-bold ${scoreColor}`}>{stock.confidenceScore}/100</span>
            </div>
            <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  stock.confidenceScore >= 75
                    ? "bg-emerald-500"
                    : stock.confidenceScore >= 50
                    ? "bg-amber-500"
                    : "bg-rose-500"
                }`}
                style={{ width: `${stock.confidenceScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* 52-Week Range Slider */}
        <div className="mt-3">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>52W Low: NPR {stock.low52w}</span>
            <span className="font-medium text-foreground">{stock.range52wPct}% of 52W Range</span>
            <span>52W High: NPR {stock.high52w}</span>
          </div>
          <div className="relative mt-1 h-2 w-full rounded-full bg-muted/80">
            <div
              className="absolute top-0 bottom-0 left-0 rounded-full bg-primary/40"
              style={{ width: `${stock.range52wPct}%` }}
            />
            <div
              className="absolute top-1/2 -mt-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary shadow-xs"
              style={{ left: `calc(${stock.range52wPct}% - 6px)` }}
            />
          </div>
        </div>

        {/* Quant Badges Grid */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
          <div className="rounded-lg border border-border/50 bg-muted/30 p-1.5">
            <span className="block text-muted-foreground text-[10px] uppercase">RSI 14</span>
            <span
              className={`font-mono font-bold ${
                (stock.rsi14 ?? 50) >= 70
                  ? "text-rose-500"
                  : (stock.rsi14 ?? 50) <= 35
                  ? "text-amber-500"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {(stock.rsi14 ?? 50).toFixed(1)}
            </span>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/30 p-1.5">
            <span className="block text-muted-foreground text-[10px] uppercase">Trend (SMA)</span>
            <span className="font-semibold text-foreground truncate block">
              {stock.smaPosition === "ABOVE_ALL"
                ? "Bullish Stack"
                : stock.smaPosition === "ABOVE_20_50"
                ? "Above 20/50"
                : stock.smaPosition === "BELOW_ALL"
                ? "Bearish"
                : "Neutral"}
            </span>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/30 p-1.5">
            <span className="block text-muted-foreground text-[10px] uppercase">Top 3 Brokers</span>
            <span
              className={`font-mono font-bold ${
                (stock.brokerAccumulationPct ?? 0) >= 38 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
              }`}
            >
              {(stock.brokerAccumulationPct ?? 0).toFixed(1)}% Acc.
            </span>
          </div>
        </div>

        {/* Catalysts & News */}
        {stock.catalysts && stock.catalysts.length > 0 && (
          <div className="mt-3 space-y-1">
            {stock.catalysts.slice(0, 2).map((c, i) => (
              <div
                key={i}
                className="flex items-start gap-1.5 rounded-lg bg-primary/5 border border-primary/15 px-2 py-1 text-[11px] text-foreground"
              >
                <span className="shrink-0 mt-0.5">
                  {c.type === "dividend" ? "🎁" : c.type === "divergence" ? "⚡" : c.type === "broker_flow" ? "🏛️" : "📢"}
                </span>
                <span className="leading-snug">{c.headline}</span>
              </div>
            ))}
          </div>
        )}

        {/* Headline Reason */}
        <p className="mt-3 text-xs leading-relaxed text-foreground font-medium">
          💡 {stock.headlineReason}
        </p>

        {/* Trade Execution Plan (Expandable) */}
        {stock.tradePlan && (
          <div className="mt-3 rounded-xl border border-primary/20 bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>🎯 Trade Execution Plan</span>
                <span className="text-[10px] font-normal text-muted-foreground">({stock.tradePlan.timeframe})</span>
              </span>
              <button
                onClick={() => setShowPlan(!showPlan)}
                className="text-[11px] text-primary hover:underline font-semibold"
              >
                {showPlan ? "Hide Levels" : "Show Levels"}
              </button>
            </div>

            {showPlan && (
              <div className="mt-2.5 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="rounded-md bg-card border border-border/50 p-1.5">
                    <span className="block text-[10px] text-muted-foreground font-sans">ENTRY ZONE</span>
                    <span className="font-bold text-foreground">
                      NPR {stock.tradePlan.entryMin} - {stock.tradePlan.entryMax}
                    </span>
                  </div>
                  <div className="rounded-md bg-rose-500/5 border border-rose-500/20 p-1.5">
                    <span className="block text-[10px] text-rose-600 dark:text-rose-400 font-sans">STOP LOSS</span>
                    <span className="font-bold text-rose-700 dark:text-rose-400">
                      NPR {stock.tradePlan.stopLoss} (-{stock.tradePlan.riskPct}%)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="rounded-md bg-emerald-500/5 border border-emerald-500/20 p-1.5">
                    <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-sans">TARGET 1</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      NPR {stock.tradePlan.target1} (+{stock.tradePlan.target1UpsidePct}%)
                    </span>
                  </div>
                  <div className="rounded-md bg-emerald-500/5 border border-emerald-500/20 p-1.5">
                    <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-sans">TARGET 2 (RUNNER)</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      NPR {stock.tradePlan.target2} (+{stock.tradePlan.target2UpsidePct}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                  <span>Risk / Reward: <strong className="text-foreground">{stock.tradePlan.riskReward}</strong></span>
                  <span className="text-primary font-medium">{stock.urgency}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Links Footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-1 border-t border-border/50 pt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <Link
            href={`/chart?symbol=${stock.symbol}`}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            📈 <span>Chart</span>
          </Link>
          <Link
            href={`/company/${stock.symbol}`}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            🏢 <span>Valuation</span>
          </Link>
          <Link
            href={`/simulator?symbol=${stock.symbol}`}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            🎮 <span>Trade</span>
          </Link>
        </div>

        <button
          onClick={() => onToggleWatchlist(stock.symbol)}
          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
            isWatchlisted
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25"
              : "bg-primary text-primary-foreground hover:opacity-90"
          }`}
        >
          <span>{isWatchlisted ? "⭐ Watchlisted" : "+ Watchlist"}</span>
        </button>
      </div>
    </article>
  );
}
