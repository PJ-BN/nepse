"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useAuth } from "@/features/auth";
import type { Holding, PortfolioAction, PortfolioHoldingEvaluation } from "../types";
import { scanPortfolio, answerPortfolioAgentQuery, type MarketQuote } from "../portfolioAgentEngine";
import { npr, signClass } from "./format";

export function PortfolioAiAdvisor({
  holdings,
  quotesMap,
  onOpenTxnModal,
}: {
  holdings: Holding[];
  quotesMap: Record<string, MarketQuote>;
  onOpenTxnModal?: (prefill: { symbol: string; type: "BUY" | "SELL"; rate?: string; qty?: number }) => void;
}) {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [hasRequested, setHasRequested] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filterAction, setFilterAction] = useState<"ALL" | PortfolioAction>("ALL");

  // Chat agent state
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "agent"; content: string; time: string }>>([
    {
      role: "agent",
      content:
        "Namaste! I am your NEPSE Portfolio AI Advisor. I analyze your purchase prices (WACCs), unrealized P/L, technical moving averages, and institutional broker flows to tell you if it's the best time to **SELL**, **WAIT**, or **BUY MORE**. Click **'Run AI Portfolio Advisor'** or ask me any question below!",
      time: "Just now",
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  // Run on-demand analysis
  const scanResult = useMemo(() => {
    if (!hasRequested || holdings.length === 0) return null;
    return scanPortfolio(holdings, quotesMap);
  }, [hasRequested, holdings, quotesMap]);

  const handleRunAdvisor = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setHasRequested(true);
      setIsAnalyzing(false);
    }, 600);
  };

  const handleAskAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputQuery.trim();
    if (!query) return;

    const userMsg = { role: "user" as const, content: query, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setChatMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsAsking(true);

    setTimeout(() => {
      const currentScan = scanResult || scanPortfolio(holdings, quotesMap);
      const answer = answerPortfolioAgentQuery(query, currentScan);
      const agentMsg = {
        role: "agent" as const,
        content: answer,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, agentMsg]);
      setIsAsking(false);
    }, 400);
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-8 sm:p-12 text-center space-y-5 shadow-xs">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary text-3xl border border-primary/25">
          🔒
        </div>
        <div className="space-y-2 max-w-lg mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary border border-primary/25">
            <span>✨</span>
            <span>Members Only AI Advisor</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">AI Portfolio Advisory Agent</h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Sign in to unlock algorithmic position rebalancing, sell/hold/buy signals on your WACCs, risk alerts, and chat directly with your personal NEPSE Portfolio Agent.
          </p>
        </div>
        <div>
          <button
            onClick={() => openAuthModal("login")}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs sm:text-sm font-bold text-primary-foreground shadow-md hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>Sign In to Unlock AI Advisor</span>
          </button>
        </div>
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border/80 bg-card p-10 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
          🤖
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="text-lg font-bold text-foreground">Your Portfolio is Empty</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Add your stock transactions or click &ldquo;Load Sample Portfolio&rdquo; in the header to activate the AI Portfolio Advisor.
          </p>
        </div>
      </div>
    );
  }

  const { report, evaluations } = scanResult || {
    report: null,
    evaluations: [] as PortfolioHoldingEvaluation[],
  };

  const filteredEvaluations = evaluations.filter((item) => {
    if (filterAction === "ALL") return true;
    return item.action === filterAction;
  });

  return (
    <div className="space-y-7">
      {/* 1. Top On-Demand Advisor Banner */}
      {!hasRequested && !isAnalyzing && (
        <section className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md text-2xl">
                🤖
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                  <span>NEPSE Algorithmic Intelligence</span>
                  <span>·</span>
                  <span>On Demand</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  AI Portfolio Advisory Agent
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                  Evaluates your purchase WACCs, unrealized P/L percentages, RSI momentum, moving average trends, and top broker accumulation to pinpoint whether to <strong>SELL</strong>, <strong>WAIT</strong>, or <strong>BUY MORE</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={handleRunAdvisor}
              className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-md hover:opacity-95 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
            >
              <span>⚡</span>
              <span>Run AI Portfolio Advisor</span>
            </button>
          </div>
        </section>
      )}

      {/* Loading state */}
      {isAnalyzing && (
        <section className="rounded-3xl border border-primary/30 bg-card p-10 text-center space-y-4 animate-in fade-in">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center text-2xl animate-spin">
              ⚙️
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">Analyzing Your {holdings.length} Positions with AI…</h3>
            <p className="text-xs text-muted-foreground font-mono">
              Computing WACC deviations, RSI divergences, 52-week channels, and broker floorsheet accumulation…
            </p>
          </div>
        </section>
      )}

      {/* 2. Executive Report & Metrics Strip (When analysis is active) */}
      {hasRequested && report && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Header Action Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary text-xl">
                🧠
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">AI Portfolio Assessment</h2>
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Active Signals
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Evaluated at {report.evaluatedAt} across {report.actionCounts.total} holdings
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleRunAdvisor}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-surface px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/30 transition-colors"
              >
                <span>🔄</span>
                <span>Re-analyze</span>
              </button>
            </div>
          </div>

          {/* Health Score & Quick Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Health Score */}
            <div className="rounded-2xl border border-border/80 bg-card p-4 flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>Portfolio Health</span>
                <span className="font-mono text-foreground">{report.riskProfile}</span>
              </div>
              <div className="my-2 flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-foreground">
                  {report.overallHealthScore}
                </span>
                <span className="text-xs text-muted-foreground font-mono">/ 100</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    report.overallHealthScore >= 80
                      ? "bg-emerald-500"
                      : report.overallHealthScore >= 60
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                  style={{ width: `${report.overallHealthScore}%` }}
                />
              </div>
            </div>

            {/* Sell Signals */}
            <div
              onClick={() => setFilterAction("SELL")}
              className={`rounded-2xl border p-4 flex flex-col justify-between shadow-2xs cursor-pointer transition-all ${
                filterAction === "SELL"
                  ? "border-rose-500/60 bg-rose-500/10 ring-1 ring-rose-500/50"
                  : "border-border/80 bg-card hover:border-rose-500/30"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                <span>Sell / Trim Alerts</span>
                <span>🔴</span>
              </div>
              <div className="my-1 text-2xl font-black text-rose-600 dark:text-rose-400">
                {report.actionCounts.sell} Scrips
              </div>
              <div className="text-[11px] text-muted-foreground">
                Take-profit targets & stop-loss preservation
              </div>
            </div>

            {/* Wait / Hold Signals */}
            <div
              onClick={() => setFilterAction("WAIT")}
              className={`rounded-2xl border p-4 flex flex-col justify-between shadow-2xs cursor-pointer transition-all ${
                filterAction === "WAIT"
                  ? "border-amber-500/60 bg-amber-500/10 ring-1 ring-amber-500/50"
                  : "border-border/80 bg-card hover:border-amber-500/30"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <span>Wait / Hold</span>
                <span>🟡</span>
              </div>
              <div className="my-1 text-2xl font-black text-amber-600 dark:text-amber-400">
                {report.actionCounts.wait} Scrips
              </div>
              <div className="text-[11px] text-muted-foreground">
                Riding intact trends with trailing stops
              </div>
            </div>

            {/* Buy More Signals */}
            <div
              onClick={() => setFilterAction("BUY_MORE")}
              className={`rounded-2xl border p-4 flex flex-col justify-between shadow-2xs cursor-pointer transition-all ${
                filterAction === "BUY_MORE"
                  ? "border-emerald-500/60 bg-emerald-500/10 ring-1 ring-emerald-500/50"
                  : "border-border/80 bg-card hover:border-emerald-500/30"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <span>Buy More</span>
                <span>🟢</span>
              </div>
              <div className="my-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {report.actionCounts.buyMore} Scrips
              </div>
              <div className="text-[11px] text-muted-foreground">
                Average down on dips & pyramid winners
              </div>
            </div>
          </div>

          {/* Executive Strategy Banner */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 shadow-2xs">
            <span className="text-2xl shrink-0">💡</span>
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-primary">
                Executive Strategy Brief
              </div>
              <div className="text-xs sm:text-sm font-medium text-foreground leading-relaxed">
                {report.executiveBrief}
              </div>
              <div className="text-xs text-muted-foreground">
                {report.tacticalAdvice}
              </div>
            </div>
          </div>

          {/* 3. Action Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setFilterAction("ALL")}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  filterAction === "ALL"
                    ? "bg-foreground text-background shadow-xs"
                    : "bg-surface text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                All Holdings ({report.actionCounts.total})
              </button>
              <button
                onClick={() => setFilterAction("SELL")}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filterAction === "SELL"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-surface text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                }`}
              >
                <span>🔴</span>
                <span>Sell / Trim ({report.actionCounts.sell})</span>
              </button>
              <button
                onClick={() => setFilterAction("WAIT")}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filterAction === "WAIT"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-surface text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                }`}
              >
                <span>🟡</span>
                <span>Wait / Hold ({report.actionCounts.wait})</span>
              </button>
              <button
                onClick={() => setFilterAction("BUY_MORE")}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filterAction === "BUY_MORE"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-surface text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                }`}
              >
                <span>🟢</span>
                <span>Buy More ({report.actionCounts.buyMore})</span>
              </button>
            </div>

            <div className="text-xs text-muted-foreground font-medium">
              Showing {filteredEvaluations.length} of {evaluations.length} evaluated positions
            </div>
          </div>

          {/* 4. Holding Evaluation Cards Grid */}
          <div className="grid gap-5 md:grid-cols-2">
            {filteredEvaluations.map((item) => {
              const isBuy = item.action === "BUY_MORE";
              const isSell = item.action === "SELL";

              return (
                <div
                  key={item.symbol}
                  className={`rounded-3xl border bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between transition-all hover:border-foreground/30 ${
                    isBuy
                      ? "border-emerald-500/30"
                      : isSell
                      ? "border-rose-500/30"
                      : "border-amber-500/30"
                  }`}
                >
                  <div className="space-y-4">
                    {/* Card Header: Symbol, Name, Action Badge */}
                    <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/chart?symbol=${item.symbol}`}
                            className="text-lg font-black tracking-tight text-foreground hover:underline"
                          >
                            {item.symbol}
                          </Link>
                          <span className="text-xs text-muted-foreground truncate max-w-[140px] sm:max-w-[200px]">
                            {item.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {item.sector} · Weight: {item.weightPct.toFixed(1)}%
                        </div>
                      </div>

                      {/* Action Verdict Badge */}
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider shadow-2xs ${
                            isBuy
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                              : isSell
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          <span>{isBuy ? "🟢" : isSell ? "🔴" : "🟡"}</span>
                          <span>{isBuy ? "BUY MORE" : isSell ? "SELL / TRIM" : "WAIT / HOLD"}</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold text-muted-foreground">
                          {item.confidenceScore}% Confluence
                        </span>
                      </div>
                    </div>

                    {/* Position Vital Metrics Strip */}
                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface p-3 text-xs font-mono">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase font-sans font-bold">
                          Holdings
                        </div>
                        <div className="font-bold text-foreground">
                          {item.qty.toLocaleString()} units
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          WACC: Rs. {npr(item.wacc)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase font-sans font-bold">
                          Current LTP
                        </div>
                        <div className="font-bold text-foreground">
                          Rs. {npr(item.ltp)}
                        </div>
                        <div className={`text-[10px] font-bold ${signClass(item.dayChangePct)}`}>
                          {item.dayChangePct >= 0 ? "+" : ""}{item.dayChangePct.toFixed(2)}% today
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground uppercase font-sans font-bold">
                          Unrealized P/L
                        </div>
                        <div className={`font-bold ${signClass(item.unrealizedPnl)}`}>
                          {item.unrealizedPnl >= 0 ? "+" : ""}Rs. {npr(item.unrealizedPnl)}
                        </div>
                        <div className={`text-[10px] font-bold ${signClass(item.unrealizedPnlPct)}`}>
                          ({item.unrealizedPnlPct >= 0 ? "+" : ""}{item.unrealizedPnlPct.toFixed(1)}%)
                        </div>
                      </div>
                    </div>

                    {/* AI Primary Reason & Breakdown */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-foreground leading-snug">
                        {item.primaryReason}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.detailedAnalysis}
                      </p>
                    </div>

                    {/* Tactical Action Plan Box */}
                    <div
                      className={`rounded-2xl p-3.5 text-xs space-y-2 border ${
                        isBuy
                          ? "bg-emerald-500/5 border-emerald-500/20"
                          : isSell
                          ? "bg-rose-500/5 border-rose-500/20"
                          : "bg-amber-500/5 border-amber-500/20"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="uppercase tracking-wider text-[11px] text-foreground flex items-center gap-1.5">
                          <span>🎯</span>
                          <span>{item.actionPlan.actionHeadline}</span>
                        </span>
                        {item.urgency === "IMMEDIATE" && (
                          <span className="rounded-full bg-rose-600 text-white text-[9px] font-extrabold px-2 py-0.5">
                            ACT NOW
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-foreground/90 font-medium">
                        {item.actionPlan.suggestedAction}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                        {item.actionPlan.targetPrice && (
                          <div>
                            <span className="text-muted-foreground">Target Exit:</span>{" "}
                            <span className="font-bold text-foreground">Rs. {item.actionPlan.targetPrice}</span>
                          </div>
                        )}
                        {item.actionPlan.stopLossPrice && (
                          <div>
                            <span className="text-muted-foreground">Stop Loss:</span>{" "}
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              Rs. {item.actionPlan.stopLossPrice}
                            </span>
                          </div>
                        )}
                        {item.actionPlan.accumulationZone && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Accumulation Zone:</span>{" "}
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              Rs. {item.actionPlan.accumulationZone.min} - Rs. {item.actionPlan.accumulationZone.max}
                            </span>
                          </div>
                        )}
                        {item.actionPlan.potentialProceeds && (
                          <div className="col-span-2 text-muted-foreground">
                            Est. Proceeds:{" "}
                            <span className="font-bold text-foreground">
                              NPR {item.actionPlan.potentialProceeds.toLocaleString()}
                            </span>{" "}
                            {item.actionPlan.cgtEstimate && `(${item.actionPlan.cgtEstimate})`}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Signal Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                      <span className="rounded-md border border-border/80 bg-surface px-2 py-0.5 text-muted-foreground">
                        Trend: <strong className="text-foreground">{item.signals.trendRegime.toUpperCase()}</strong>
                      </span>
                      <span className="rounded-md border border-border/80 bg-surface px-2 py-0.5 text-muted-foreground">
                        RSI: <strong className="text-foreground">{item.signals.rsi.toFixed(1)}</strong>
                      </span>
                      {item.signals.brokerAccumulationPct != null && (
                        <span className="rounded-md border border-border/80 bg-surface px-2 py-0.5 text-muted-foreground">
                          Brokers: <strong className="text-foreground">{item.signals.brokerAccumulationPct.toFixed(0)}% Accum</strong>
                        </span>
                      )}
                      {item.signals.concentrationRisk !== "safe" && (
                        <span className="rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 font-bold">
                          {item.signals.concentrationRisk.toUpperCase()} WEIGHT
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="mt-5 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/chart?symbol=${item.symbol}`}
                        className="rounded-lg border border-border/80 bg-surface px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
                      >
                        📊 Chart
                      </Link>
                      <Link
                        href={`/company?symbol=${item.symbol}`}
                        className="rounded-lg border border-border/80 bg-surface px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
                      >
                        🏢 Details
                      </Link>
                    </div>

                    {onOpenTxnModal && (
                      <button
                        onClick={() =>
                          onOpenTxnModal({
                            symbol: item.symbol,
                            type: isSell ? "SELL" : "BUY",
                            rate: String(item.ltp),
                            qty: isSell ? item.actionPlan.suggestedTrimQty || item.qty : Math.max(10, Math.floor(item.qty * 0.5)),
                          })
                        }
                        className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold shadow-2xs transition-transform active:scale-95 ${
                          isSell
                            ? "bg-rose-600 text-white hover:bg-rose-700"
                            : isBuy
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-foreground text-background hover:opacity-90"
                        }`}
                      >
                        <span>{isSell ? "Sell / Trim Lot" : isBuy ? "+ Buy More Lot" : "Adjust Position"}</span>
                        <span>→</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sector Allocation Breakdown */}
          {report.sectorDiversification.length > 0 && (
            <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Sector Diversification & Risk Distribution
                </h3>
                <span className="text-xs text-muted-foreground">
                  {report.sectorDiversification.length} Sectors Represented
                </span>
              </div>

              {/* Multi-segmented color bar */}
              <div className="h-3 w-full rounded-full bg-muted/40 overflow-hidden flex">
                {report.sectorDiversification.map((s, idx) => {
                  const colors = [
                    "bg-blue-500",
                    "bg-emerald-500",
                    "bg-purple-500",
                    "bg-amber-500",
                    "bg-rose-500",
                    "bg-cyan-500",
                  ];
                  const color = colors[idx % colors.length];
                  return (
                    <div
                      key={s.sector}
                      className={`h-full ${color} transition-all duration-500`}
                      style={{ width: `${s.weightPct}%` }}
                      title={`${s.sector}: ${s.weightPct.toFixed(1)}%`}
                    />
                  );
                })}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                {report.sectorDiversification.map((s) => (
                  <div key={s.sector} className="rounded-xl border border-border/60 bg-surface p-2.5 text-xs">
                    <div className="font-bold text-foreground truncate">{s.sector}</div>
                    <div className="flex items-center justify-between text-muted-foreground font-mono mt-1">
                      <span>{s.weightPct.toFixed(1)}%</span>
                      <span>Rs. {npr(s.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Interactive Portfolio AI Agent Chat Box */}
      <section className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="border-b border-border/60 bg-surface/50 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary text-xl">
              💬
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Ask AI Agent About Your Portfolio
              </h3>
              <p className="text-xs text-muted-foreground">
                Ask direct questions like &ldquo;Should I sell NABIL?&rdquo; or &ldquo;How to reduce my risk?&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Chat message history */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[360px] overflow-y-auto">
          {chatMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground font-medium rounded-br-xs"
                    : "bg-surface border border-border/80 text-foreground shadow-2xs rounded-bl-xs"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div
                  className={`mt-1.5 text-[10px] font-mono ${
                    msg.role === "user" ? "text-primary-foreground/75" : "text-muted-foreground"
                  }`}
                >
                  {msg.time}
                </div>
              </div>
            </div>
          ))}

          {isAsking && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
              <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
              <span>AI Agent analyzing your holdings…</span>
            </div>
          )}
        </div>

        {/* Quick prompt suggestions */}
        <div className="border-t border-border/60 bg-muted/20 px-4 py-2.5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-muted-foreground uppercase">Suggested:</span>
          {["Which stock should I sell first?", "Is it safe to buy more of my losing scrips?", "What is my biggest concentration risk?"].map(
            (prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setInputQuery(prompt)}
                className="rounded-full border border-border/80 bg-card px-2.5 py-1 text-[11px] text-foreground hover:bg-muted/40 transition-colors"
              >
                {prompt}
              </button>
            )
          )}
        </div>

        {/* Input box */}
        <form onSubmit={handleAskAgent} className="p-4 border-t border-border/60 flex items-center gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask about your holdings, target exits, or accumulation zones…"
            className="flex-1 rounded-xl border border-border/80 bg-surface px-4 py-2.5 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isAsking}
            className="rounded-xl bg-primary px-5 py-2.5 text-xs sm:text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            Send
          </button>
        </form>
      </section>
    </div>
  );
}
