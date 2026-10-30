"use client";

import Link from "next/link";
import { usePortfolioManager } from "../hooks/usePortfolioManager";
import { scanPortfolio } from "../portfolioAgentEngine";
import { npr, signClass } from "./format";

export function PortfolioPulseWidget() {
  const { holdings, summary, quotesMap, isLoaded } = usePortfolioManager();

  if (!isLoaded) return null;

  const scan = holdings.length > 0 ? scanPortfolio(holdings, quotesMap) : null;
  const buyCount = scan?.report.actionCounts.buyMore ?? 0;
  const sellCount = scan?.report.actionCounts.sell ?? 0;
  const waitCount = scan?.report.actionCounts.wait ?? 0;

  return (
    <section className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary text-xl shadow-2xs">
            💼
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Portfolio Pulse & AI Advisor
              </h2>
              {holdings.length > 0 && (
                <span className="rounded-full bg-primary/15 text-primary border border-primary/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  Live
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {holdings.length > 0
                ? `${holdings.length} tracked scrips · Real-time P/L & algorithmic signals`
                : "Track holdings, exact WACCs, and get AI Sell, Wait or Buy More signals"}
            </p>
          </div>
        </div>

        <Link
          href="/portfolio"
          className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-xs font-bold text-background hover:opacity-90 transition-opacity shrink-0"
        >
          <span>Open Portfolio & AI</span>
          <span>→</span>
        </Link>
      </div>

      {holdings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-surface/50 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground text-center sm:text-left">
            You haven&apos;t added any positions yet. Get automated AI analysis on whether to sell, wait or buy more.
          </div>
          <Link
            href="/portfolio"
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            + Set Up Portfolio
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Value */}
          <div className="rounded-xl border border-border/70 bg-surface p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Portfolio Value
            </div>
            <div className="my-1 font-mono text-xl font-black text-foreground">
              Rs. {npr(summary.marketValue)}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              Cost: Rs. {npr(summary.totalCost)}
            </div>
          </div>

          {/* Unrealized P/L */}
          <div className="rounded-xl border border-border/70 bg-surface p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Unrealized Profit/Loss
            </div>
            <div className={`my-1 font-mono text-xl font-black ${signClass(summary.unrealizedPnl)}`}>
              {summary.unrealizedPnl >= 0 ? "+" : ""}Rs. {npr(summary.unrealizedPnl)}
            </div>
            <div className={`text-[10px] font-mono font-bold ${signClass(summary.unrealizedPnlPct)}`}>
              {summary.unrealizedPnlPct >= 0 ? "+" : ""}{summary.unrealizedPnlPct.toFixed(2)}% overall
            </div>
          </div>

          {/* Today's Change */}
          <div className="rounded-xl border border-border/70 bg-surface p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Today&apos;s Return
            </div>
            <div className={`my-1 font-mono text-xl font-black ${signClass(summary.dayChange)}`}>
              {summary.dayChange >= 0 ? "+" : ""}Rs. {npr(summary.dayChange)}
            </div>
            <div className={`text-[10px] font-mono font-bold ${signClass(summary.dayChangePct)}`}>
              {summary.dayChangePct >= 0 ? "+" : ""}{summary.dayChangePct.toFixed(2)}% session
            </div>
          </div>

          {/* AI Advisor Signals */}
          <div className="rounded-xl border border-border/70 bg-surface p-3.5 flex flex-col justify-between">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>AI Advisor Signals</span>
              <span>🤖</span>
            </div>
            <div className="flex items-center gap-1.5 my-1 text-xs font-bold">
              {sellCount > 0 && (
                <span className="rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 px-1.5 py-0.5">
                  🔴 {sellCount} Sell
                </span>
              )}
              {buyCount > 0 && (
                <span className="rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5">
                  🟢 {buyCount} Buy
                </span>
              )}
              <span className="rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5">
                🟡 {waitCount} Hold
              </span>
            </div>
            <Link
              href="/portfolio"
              className="text-[11px] text-primary font-bold hover:underline"
            >
              View Strategic Recommendations →
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
