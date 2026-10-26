"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAgentScan } from "../api";
import { useWatchlist } from "../useWatchlist";
import { StockCard } from "./StockCard";
import { AgentChatBox } from "./AgentChatBox";

type FilterTab = "ALL" | "BUY" | "WATCHLIST" | "SELL" | "MY_WATCHLIST";
type SortOption = "SCORE_DESC" | "CHANGE_DESC" | "TURNOVER_DESC" | "BROKER_DESC" | "RANGE_DESC" | "PRICE_ASC";

export function WatchlistView() {
  const { watchlist, isWatchlisted, toggleWatchlist } = useWatchlist();
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [selectedSector, setSelectedSector] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("SCORE_DESC");
  const [showChat, setShowChat] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const { data: scan, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["agent-market-scan"],
    queryFn: () => fetchAgentScan(false),
    staleTime: 5 * 60 * 1000,
  });

  const stocks = useMemo(() => scan?.stocks ?? [], [scan?.stocks]);
  const briefing = scan?.briefing;

  // Extract unique sectors
  const sectors = useMemo(() => {
    const set = new Set<string>();
    stocks.forEach((s) => {
      if (s.sector) set.add(s.sector);
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [stocks]);

  // Filter & Sort
  const filteredStocks = useMemo(() => {
    return stocks
      .filter((s) => {
        // Tab Filter
        if (activeTab === "BUY" && s.action !== "BUY") return false;
        if (activeTab === "WATCHLIST" && s.action !== "WATCHLIST") return false;
        if (activeTab === "SELL" && s.action !== "SELL") return false;
        if (activeTab === "MY_WATCHLIST" && !isWatchlisted(s.symbol)) return false;

        // Sector Filter
        if (selectedSector !== "ALL" && s.sector !== selectedSector) return false;

        // Search Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchSymbol = s.symbol.toLowerCase().includes(q);
          const matchName = s.name.toLowerCase().includes(q);
          const matchSector = s.sector.toLowerCase().includes(q);
          if (!matchSymbol && !matchName && !matchSector) return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "SCORE_DESC":
            return b.confidenceScore - a.confidenceScore;
          case "CHANGE_DESC":
            return b.changePct - a.changePct;
          case "TURNOVER_DESC":
            return b.turnover - a.turnover;
          case "BROKER_DESC":
            return b.brokerAccumulationPct - a.brokerAccumulationPct;
          case "RANGE_DESC":
            return b.range52wPct - a.range52wPct;
          case "PRICE_ASC":
            return a.close - b.close;
          default:
            return b.confidenceScore - a.confidenceScore;
        }
      });
  }, [stocks, activeTab, selectedSector, searchQuery, sortBy, isWatchlisted]);

  // Counts
  const buyCount = stocks.filter((s) => s.action === "BUY").length;
  const watchCount = stocks.filter((s) => s.action === "WATCHLIST").length;
  const sellCount = stocks.filter((s) => s.action === "SELL").length;
  const myWatchCount = stocks.filter((s) => isWatchlisted(s.symbol)).length;

  const exportCsv = () => {
    if (!filteredStocks.length) return;
    const headers = [
      "Symbol",
      "Name",
      "Sector",
      "Price",
      "Change %",
      "Action",
      "Confluence Score",
      "RSI 14",
      "Broker Accumulation %",
      "Entry Zone",
      "Stop Loss",
      "Target 1",
      "Target 2",
      "Risk Reward",
      "Key Thesis",
    ];
    const rows = filteredStocks.map((s) => [
      s.symbol,
      `"${s.name.replace(/"/g, '""')}"`,
      s.sector,
      s.close ?? 0,
      s.changePct ?? 0,
      s.action,
      s.confidenceScore,
      (s.rsi14 ?? 50).toFixed(1),
      `${(s.brokerAccumulationPct ?? 0).toFixed(1)}%`,
      s.tradePlan ? `"${s.tradePlan.entryMin} - ${s.tradePlan.entryMax}"` : "N/A",
      s.tradePlan ? s.tradePlan.stopLoss : "N/A",
      s.tradePlan ? s.tradePlan.target1 : "N/A",
      s.tradePlan ? s.tradePlan.target2 : "N/A",
      s.tradePlan ? s.tradePlan.riskReward : "N/A",
      `"${s.headlineReason.replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nepse_agent_recommendations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Executive Market Briefing */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-xs">
                ✨
              </span>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
                NEPSE Trade & Watchlist AI Agent
                <span className="rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                  Automated Scanner
                </span>
              </h1>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Autonomous multi-factor agent monitoring all active NEPSE equities. Evaluates price-to-moving-averages, RSI divergences, 15-day institutional broker accumulation, and corporate news (dividends, AGMs) to identify exactly which stocks to <strong>Watchlist</strong>, which to <strong>Buy</strong>, and which to <strong>Sell / Avoid</strong>.
            </p>

            {/* Market Regime & Tactical Strategy Card */}
            {briefing && (
              <div className="rounded-2xl border border-border/70 bg-card/80 p-4 space-y-2 backdrop-blur-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">Market Regime:</span>
                    <span className="rounded-md bg-primary/15 text-primary border border-primary/25 px-2 py-0.5 text-xs font-bold font-mono">
                      {briefing.marketRegime.replace("_", " ")}
                    </span>
                    <span className="text-xs text-muted-foreground">• Top Sector: <strong className="text-foreground">{briefing.topSectorPick}</strong></span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Scanned {briefing.totalStocksScanned} equities • Market Confidence: <strong className="text-primary">{briefing.confidenceScore}%</strong>
                  </span>
                </div>
                <p className="text-xs text-foreground font-medium">
                  📢 <strong>Executive Brief:</strong> {briefing.executiveBrief}
                </p>
                <p className="text-xs text-muted-foreground">
                  🎯 <strong>Tactical Playbook:</strong> {briefing.tacticalStrategy}
                </p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <button
              onClick={() => setShowChat(!showChat)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-95 transition-all"
            >
              <span>🤖</span>
              <span>{showChat ? "Hide AI Assistant" : "Ask AI Agent Anything"}</span>
            </button>

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              <span className={isFetching ? "animate-spin" : ""}>🔄</span>
              <span>{isFetching ? "Scanning Market…" : "Refresh Agent Scan"}</span>
            </button>
          </div>
        </div>

        {/* Quick Stat Counter Cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            onClick={() => setActiveTab("BUY")}
            className={`rounded-2xl border p-3.5 text-left transition-all ${
              activeTab === "BUY"
                ? "border-emerald-500 bg-emerald-500/10 shadow-xs"
                : "border-border/60 bg-card/60 hover:border-emerald-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">🟢 High Conviction Buys</span>
              <span className="text-base">🚀</span>
            </div>
            <div className="mt-1 font-mono text-2xl font-bold text-foreground">{buyCount}</div>
            <p className="text-[10px] text-muted-foreground">Confirmed bullish trend & flow</p>
          </button>

          <button
            onClick={() => setActiveTab("WATCHLIST")}
            className={`rounded-2xl border p-3.5 text-left transition-all ${
              activeTab === "WATCHLIST"
                ? "border-amber-500 bg-amber-500/10 shadow-xs"
                : "border-border/60 bg-card/60 hover:border-amber-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">🟡 Watchlist Setups</span>
              <span className="text-base">👁️</span>
            </div>
            <div className="mt-1 font-mono text-2xl font-bold text-foreground">{watchCount}</div>
            <p className="text-[10px] text-muted-foreground">Consolidating / Stalk trigger</p>
          </button>

          <button
            onClick={() => setActiveTab("SELL")}
            className={`rounded-2xl border p-3.5 text-left transition-all ${
              activeTab === "SELL"
                ? "border-rose-500 bg-rose-500/10 shadow-xs"
                : "border-border/60 bg-card/60 hover:border-rose-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">🔴 Sell / Take Profit</span>
              <span className="text-base">⚠️</span>
            </div>
            <div className="mt-1 font-mono text-2xl font-bold text-foreground">{sellCount}</div>
            <p className="text-[10px] text-muted-foreground">Overbought or structural breakdown</p>
          </button>

          <button
            onClick={() => setActiveTab("MY_WATCHLIST")}
            className={`rounded-2xl border p-3.5 text-left transition-all ${
              activeTab === "MY_WATCHLIST"
                ? "border-primary bg-primary/10 shadow-xs"
                : "border-border/60 bg-card/60 hover:border-primary/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary">⭐ My Personal Watchlist</span>
              <span className="text-base">⭐</span>
            </div>
            <div className="mt-1 font-mono text-2xl font-bold text-foreground">{myWatchCount}</div>
            <p className="text-[10px] text-muted-foreground">Starred by you</p>
          </button>
        </div>
      </section>

      {/* 2. Interactive Agent Chat Drawer (Collapsible) */}
      {showChat && (
        <section className="animate-in fade-in slide-in-from-top-4 duration-300">
          <AgentChatBox
            userWatchlistSymbols={watchlist}
            isWatchlisted={isWatchlisted}
            onToggleWatchlist={toggleWatchlist}
          />
        </section>
      )}

      {/* 3. Filter Controls & Navigation Tabs */}
      <section className="space-y-3">
        {/* Top Filter Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === "ALL"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              All Scanned Equities ({stocks.length})
            </button>
            <button
              onClick={() => setActiveTab("BUY")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === "BUY"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
              }`}
            >
              🟢 Buys ({buyCount})
            </button>
            <button
              onClick={() => setActiveTab("WATCHLIST")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === "WATCHLIST"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
              }`}
            >
              🟡 Watchlist ({watchCount})
            </button>
            <button
              onClick={() => setActiveTab("SELL")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === "SELL"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20"
              }`}
            >
              🔴 Sells ({sellCount})
            </button>
            <button
              onClick={() => setActiveTab("MY_WATCHLIST")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === "MY_WATCHLIST"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              }`}
            >
              ⭐ My Watchlist ({myWatchCount})
            </button>
          </div>

          {/* Export & View Toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              disabled={filteredStocks.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              <span>📥</span>
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <div className="flex items-center rounded-xl border border-border bg-card p-0.5">
              <button
                onClick={() => setViewMode("cards")}
                title="Grid Cards View"
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  viewMode === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode("table")}
                title="Table View"
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  viewMode === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Search, Sector, and Sort Controls */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {/* Search */}
          <div className="relative">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticker, company name, or sector…"
              className="w-full rounded-xl border border-input bg-card px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sector Selector */}
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="rounded-xl border border-input bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {sectors.map((sec) => (
              <option key={sec} value={sec}>
                {sec === "ALL" ? "All Sectors" : sec}
              </option>
            ))}
          </select>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-xl border border-input bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="SCORE_DESC">Highest Confluence Score</option>
            <option value="CHANGE_DESC">Highest 1D Gain %</option>
            <option value="TURNOVER_DESC">Highest Turnover</option>
            <option value="BROKER_DESC">Highest Broker Accumulation %</option>
            <option value="RANGE_DESC">Highest in 52W Range (Breakouts)</option>
            <option value="PRICE_ASC">Lowest Share Price (Under NPR)</option>
          </select>
        </div>
      </section>

      {/* 4. Results List */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted/30 border border-border/40" />
          ))}
        </div>
      ) : filteredStocks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/80 p-12 text-center">
          <span className="text-3xl">🔍</span>
          <h3 className="mt-2 text-sm font-bold text-foreground">No matching equities found</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
            {activeTab === "MY_WATCHLIST"
              ? "Your personal watchlist has no saved stocks matching this filter. Click the ⭐ star button on any stock to add it to your personal watchlist!"
              : "Try adjusting your search criteria, switching tabs, or selecting 'All Sectors'."}
          </p>
          {activeTab === "MY_WATCHLIST" && (
            <button
              onClick={() => setActiveTab("ALL")}
              className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              Browse All Recommendations
            </button>
          )}
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStocks.map((stock) => (
            <StockCard
              key={stock.symbol}
              stock={stock}
              isWatchlisted={isWatchlisted(stock.symbol)}
              onToggleWatchlist={toggleWatchlist}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-3">Price</th>
                <th className="py-3 px-3">1D %</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Score</th>
                <th className="py-3 px-3">RSI 14</th>
                <th className="py-3 px-3">Broker Acc.</th>
                <th className="py-3 px-3">Entry Zone</th>
                <th className="py-3 px-3">Stop</th>
                <th className="py-3 px-3">Target 1</th>
                <th className="py-3 px-3">Key Thesis</th>
                <th className="py-3 px-4 text-right">Watchlist</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredStocks.map((s) => {
                const isBuy = s.action === "BUY";
                const isWatch = s.action === "WATCHLIST";
                const badge = isBuy
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                  : isWatch
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25"
                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25";

                return (
                  <tr key={s.symbol} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-foreground">{s.symbol}</div>
                      <div className="truncate max-w-[120px] text-[10px] text-muted-foreground">{s.name}</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-foreground">
                      NPR {(s.close ?? 0).toLocaleString()}
                    </td>
                    <td
                      className={`py-3 px-3 font-mono font-semibold ${
                        (s.changePct ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {(s.changePct ?? 0) >= 0 ? "+" : ""}
                      {(s.changePct ?? 0).toFixed(2)}%
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge}`}>
                        {s.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-primary">
                      {s.confidenceScore}/100
                    </td>
                    <td className="py-3 px-3 font-mono text-muted-foreground">{(s.rsi14 ?? 50).toFixed(1)}</td>
                    <td className="py-3 px-3 font-mono font-medium text-foreground">
                      {(s.brokerAccumulationPct ?? 0).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 font-mono text-foreground">
                      {s.tradePlan ? `${s.tradePlan.entryMin} - ${s.tradePlan.entryMax}` : "—"}
                    </td>
                    <td className="py-3 px-3 font-mono text-rose-600 dark:text-rose-400">
                      {s.tradePlan ? s.tradePlan.stopLoss : "—"}
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-600 dark:text-emerald-400">
                      {s.tradePlan ? `${s.tradePlan.target1} (+${s.tradePlan.target1UpsidePct}%)` : "—"}
                    </td>
                    <td className="py-3 px-3 text-[11px] text-muted-foreground max-w-xs truncate" title={s.headlineReason}>
                      {s.headlineReason}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => toggleWatchlist(s.symbol)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          isWatchlisted(s.symbol)
                            ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
                            : "bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground"
                        }`}
                      >
                        {isWatchlisted(s.symbol) ? "⭐ In Watchlist" : "+ Star"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
