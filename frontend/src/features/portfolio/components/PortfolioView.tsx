"use client";

import { useState } from "react";
import { usePortfolioManager } from "../hooks/usePortfolioManager";
import { HoldingsTable } from "./HoldingsTable";
import { PortfolioAiAdvisor } from "./PortfolioAiAdvisor";
import { TxnLedger } from "./TxnLedger";
import { FeeCalculator } from "./FeeCalculator";
import { TxnModal } from "./TxnModal";
import { CloudSyncModal } from "./CloudSyncModal";
import { npr, signClass } from "./format";
import type { TxnType } from "../types";

export function PortfolioView() {
  const {
    isCloud,
    holdings,
    transactions,
    realized,
    summary,
    quotesMap,
    addTransaction,
    removeHolding,
    deleteTransaction,
    loadSamplePortfolio,
    clearPortfolio,
    logout,
  } = usePortfolioManager();

  const [activeTab, setActiveTab] = useState<"HOLDINGS" | "AI_ADVISOR" | "TXNS" | "REALIZED" | "CALCULATOR">("HOLDINGS");
  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [txnPrefill, setTxnPrefill] = useState<{ symbol: string; type: TxnType; rate?: string; qty?: number } | undefined>();

  const openTxnModalWithPrefill = (prefill: { symbol: string; type: TxnType; rate?: string; qty?: number }) => {
    setTxnPrefill(prefill);
    setIsTxnModalOpen(true);
  };

  return (
    <div className="space-y-7 pb-12">
      {/* 1. Header Banner */}
      <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary text-xl">
                💼
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                    Portfolio & AI Advisor
                  </h1>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                      isCloud
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-surface border-border/80 text-muted-foreground"
                    }`}
                  >
                    {isCloud ? "Cloud Connected" : "Local Storage"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time NEPSE valuations, exact WACC tax accounting, and AI-driven Sell, Wait or Buy More signals
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setTxnPrefill(undefined);
                setIsTxnModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-95 transition-all active:scale-95"
            >
              <span>+</span>
              <span>Record Transaction</span>
            </button>

            <button
              onClick={() => setActiveTab("AI_ADVISOR")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:opacity-95 transition-all active:scale-95"
            >
              <span>🤖</span>
              <span>AI Advisor</span>
            </button>

            <button
              onClick={() => setIsCloudModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors"
            >
              <span>☁️</span>
              <span>{isCloud ? "Account" : "Cloud Sync"}</span>
            </button>

            {/* Overflow options */}
            <div className="relative group">
              <button className="rounded-xl border border-border/80 bg-surface p-2 text-xs text-muted-foreground hover:text-foreground">
                ⚙️
              </button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col w-48 rounded-xl border border-border/80 bg-card p-1 shadow-lg z-20 text-xs">
                <button
                  onClick={loadSamplePortfolio}
                  className="rounded-lg px-3 py-2 text-left font-medium hover:bg-muted/30 transition-colors"
                >
                  ✨ Load Sample Portfolio
                </button>
                <button
                  onClick={() => {
                    if (confirm("Clear all transactions and reset portfolio?")) clearPortfolio();
                  }}
                  className="rounded-lg px-3 py-2 text-left font-medium text-rose-600 hover:bg-rose-500/10 transition-colors"
                >
                  🗑️ Reset Portfolio
                </button>
                {isCloud && (
                  <button
                    onClick={logout}
                    className="rounded-lg px-3 py-2 text-left font-medium text-muted-foreground hover:bg-muted/30 transition-colors"
                  >
                    Log Out
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Vital Metrics Ribbon */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Value */}
          <div className="rounded-2xl border border-border/70 bg-surface p-4 flex flex-col justify-between shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Portfolio Value
            </div>
            <div className="my-1 font-mono text-2xl font-black text-foreground">
              Rs. {npr(summary.marketValue)}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center justify-between font-mono">
              <span>Cost Basis:</span>
              <span>Rs. {npr(summary.totalCost)}</span>
            </div>
          </div>

          {/* Unrealized P/L */}
          <div className="rounded-2xl border border-border/70 bg-surface p-4 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Overall Unrealized P/L</span>
              <span className={`font-mono font-bold ${signClass(summary.unrealizedPnlPct)}`}>
                {summary.unrealizedPnlPct >= 0 ? "▲" : "▼"} {summary.unrealizedPnlPct >= 0 ? "+" : ""}
                {summary.unrealizedPnlPct.toFixed(2)}%
              </span>
            </div>
            <div className={`my-1 font-mono text-2xl font-black ${signClass(summary.unrealizedPnl)}`}>
              {summary.unrealizedPnl >= 0 ? "+" : ""}Rs. {npr(summary.unrealizedPnl)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Pre-tax gain on active holdings
            </div>
          </div>

          {/* Today's Change */}
          <div className="rounded-2xl border border-border/70 bg-surface p-4 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Today&apos;s Return</span>
              <span className={`font-mono font-bold ${signClass(summary.dayChangePct)}`}>
                {summary.dayChangePct >= 0 ? "+" : ""}{summary.dayChangePct.toFixed(2)}%
              </span>
            </div>
            <div className={`my-1 font-mono text-xl font-black ${signClass(summary.dayChange)}`}>
              {summary.dayChange >= 0 ? "+" : ""}Rs. {npr(summary.dayChange)}
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              Live market session movement
            </div>
          </div>

          {/* Holdings Count & Top Performer */}
          <div className="rounded-2xl border border-border/70 bg-surface p-4 flex flex-col justify-between shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Active Scrips
            </div>
            <div className="my-1 font-mono text-xl font-black text-foreground">
              {summary.holdingsCount} Listed Equities
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {summary.topGainer ? (
                <span>
                  Top: <strong className="text-foreground">{summary.topGainer.symbol}</strong> (
                  <span className={signClass(summary.topGainer.unrealized_pnl_pct)}>
                    +{summary.topGainer.unrealized_pnl_pct?.toFixed(1)}%
                  </span>
                  )
                </span>
              ) : (
                "Diversified Allocation"
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab("HOLDINGS")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "HOLDINGS"
                ? "bg-foreground text-background shadow-xs"
                : "bg-surface text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            <span>📊</span>
            <span>Holdings & Positions ({holdings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("AI_ADVISOR")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "AI_ADVISOR"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs"
                : "bg-surface text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
            }`}
          >
            <span>🤖</span>
            <span>AI Portfolio Advisor</span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[9px] font-extrabold uppercase">
              Signals
            </span>
          </button>

          <button
            onClick={() => setActiveTab("TXNS")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "TXNS"
                ? "bg-foreground text-background shadow-xs"
                : "bg-surface text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            <span>📝</span>
            <span>Transactions ({transactions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("REALIZED")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "REALIZED"
                ? "bg-foreground text-background shadow-xs"
                : "bg-surface text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            <span>💰</span>
            <span>Realized P/L & CGT</span>
          </button>

          <button
            onClick={() => setActiveTab("CALCULATOR")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "CALCULATOR"
                ? "bg-foreground text-background shadow-xs"
                : "bg-surface text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            <span>🧮</span>
            <span>NEPSE Fee Calculator</span>
          </button>
        </div>
      </div>

      {/* 3. Tab Contents */}
      {activeTab === "HOLDINGS" && (
        <div className="space-y-4">
          <HoldingsTable
            holdings={holdings}
            quotesMap={quotesMap}
            totalValue={summary.marketValue}
            onOpenTxnModal={openTxnModalWithPrefill}
            onRemoveHolding={removeHolding}
          />
        </div>
      )}

      {activeTab === "AI_ADVISOR" && (
        <PortfolioAiAdvisor
          holdings={holdings}
          quotesMap={quotesMap}
          onOpenTxnModal={openTxnModalWithPrefill}
        />
      )}

      {activeTab === "TXNS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Transaction Ledger
            </h3>
            <button
              onClick={() => {
                setTxnPrefill(undefined);
                setIsTxnModalOpen(true);
              }}
              className="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              + Add Transaction
            </button>
          </div>
          <TxnLedger transactions={transactions} onDeleteTxn={deleteTransaction} />
        </div>
      )}

      {activeTab === "REALIZED" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Realized Capital Gains & Taxes</h3>
                <p className="text-xs text-muted-foreground">
                  FIFO basis profit realization and SEBON Capital Gains Tax (CGT) summary
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-muted-foreground">Total Realized:</span>{" "}
                  <strong className={signClass(realized.total_realized_pnl)}>
                    NPR {npr(realized.total_realized_pnl)}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Total CGT Paid:</span>{" "}
                  <strong className="text-foreground">NPR {npr(realized.total_cgt)}</strong>
                </div>
              </div>
            </div>

            {realized.sells.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No realized sell transactions yet. Sells will automatically calculate FIFO cost basis and capital gains tax.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-surface/60 border-b border-border/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Sell Date</th>
                      <th className="py-2.5 px-3 text-left">Symbol</th>
                      <th className="py-2.5 px-3">Units</th>
                      <th className="py-2.5 px-3">Rate</th>
                      <th className="py-2.5 px-3">Fees</th>
                      <th className="py-2.5 px-3">CGT</th>
                      <th className="py-2.5 px-3">Cost Basis</th>
                      <th className="py-2.5 px-3">Net Received</th>
                      <th className="py-2.5 px-3">Realized P/L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-mono">
                    {realized.sells.map((s, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="py-2.5 px-3 text-left font-sans text-muted-foreground">{s.sell_date}</td>
                        <td className="py-2.5 px-3 text-left font-bold text-foreground">{s.symbol}</td>
                        <td className="py-2.5 px-3">{s.qty.toLocaleString()}</td>
                        <td className="py-2.5 px-3">Rs. {npr(s.rate)}</td>
                        <td className="py-2.5 px-3">Rs. {npr(s.total_fees)}</td>
                        <td className="py-2.5 px-3 text-rose-600 dark:text-rose-400">Rs. {npr(s.cgt)}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">Rs. {npr(s.cost_basis)}</td>
                        <td className="py-2.5 px-3 font-bold text-foreground">Rs. {npr(s.net_receivable)}</td>
                        <td className={`py-2.5 px-3 font-bold ${signClass(s.realized_pnl)}`}>
                          Rs. {npr(s.realized_pnl)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "CALCULATOR" && (
        <div className="rounded-2xl border border-border/80 bg-card p-6 space-y-4">
          <div className="border-b border-border/60 pb-3">
            <h3 className="text-base font-bold text-foreground">NEPSE Fee & CGT Calculator</h3>
            <p className="text-xs text-muted-foreground">
              Calculate exact broker commission slabs (0.40% to 0.27%), SEBON fee (0.015%), DP charge (Rs. 25), and Capital Gains Tax
            </p>
          </div>
          <FeeCalculator />
        </div>
      )}

      {/* Modals */}
      <TxnModal
        isOpen={isTxnModalOpen}
        onClose={() => setIsTxnModalOpen(false)}
        onSubmit={addTransaction}
        prefill={txnPrefill}
      />

      <CloudSyncModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        token={isCloud ? "token" : null}
      />
    </div>
  );
}
