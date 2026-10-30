"use client";

import Link from "next/link";
import type { Holding } from "../types";
import { npr, signClass } from "./format";
import type { MarketQuote } from "../portfolioAgentEngine";
import { evaluatePortfolioHolding } from "../portfolioAgentEngine";

export function HoldingsTable({
  holdings,
  quotesMap,
  totalValue,
  onOpenTxnModal,
  onRemoveHolding,
}: {
  holdings: Holding[];
  quotesMap: Record<string, MarketQuote>;
  totalValue: number;
  onOpenTxnModal: (prefill: { symbol: string; type: "BUY" | "SELL"; rate?: string; qty?: number }) => void;
  onRemoveHolding: (symbol: string) => void;
}) {
  if (holdings.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border/80 bg-card p-10 text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/40 text-2xl">
          📂
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground">No Holdings in Portfolio</h3>
          <p className="text-xs text-muted-foreground">
            Click &ldquo;+ Add Transaction&rdquo; above or &ldquo;Load Sample Portfolio&rdquo; to populate your portfolio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-xs">
      <table className="w-full text-right text-xs">
        <thead className="bg-surface/60 border-b border-border/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="py-3 px-4 text-left">Company / Symbol</th>
            <th className="py-3 px-3">Units</th>
            <th className="py-3 px-3">WACC</th>
            <th className="py-3 px-3">LTP</th>
            <th className="py-3 px-3">Market Value</th>
            <th className="py-3 px-3">Unrealized P/L</th>
            <th className="py-3 px-3">Weight</th>
            <th className="py-3 px-3 text-center">AI Signal</th>
            <th className="py-3 px-4 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {holdings.map((h) => {
            const sym = h.symbol.toUpperCase();
            const evaluation = evaluatePortfolioHolding(h, totalValue, quotesMap);
            const isBuy = evaluation.action === "BUY_MORE";
            const isSell = evaluation.action === "SELL";
            const unPnl = Number(h.unrealized_pnl || 0);
            const unPnlPct = h.unrealized_pnl_pct ?? 0;
            const dayChgPct = h.day_change_pct ?? 0;

            return (
              <tr key={sym} className="hover:bg-muted/20 transition-colors">
                {/* Symbol & Name */}
                <td className="py-3.5 px-4 text-left">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface border border-border/80 font-black text-xs text-foreground shrink-0">
                      {sym.slice(0, 2)}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/chart?symbol=${sym}`}
                          className="font-bold text-sm text-foreground hover:underline"
                        >
                          {sym}
                        </Link>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-[140px] sm:max-w-[180px]">
                        {h.name || sym}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Units */}
                <td className="py-3.5 px-3 font-mono font-medium text-foreground">
                  {h.qty.toLocaleString("en-IN")}
                </td>

                {/* WACC */}
                <td className="py-3.5 px-3 font-mono text-muted-foreground">
                  Rs. {npr(h.wacc)}
                </td>

                {/* LTP */}
                <td className="py-3.5 px-3">
                  <div className="font-mono font-bold text-foreground">Rs. {npr(h.ltp)}</div>
                  <div className={`text-[10px] font-mono ${signClass(dayChgPct)}`}>
                    {dayChgPct >= 0 ? "+" : ""}{dayChgPct.toFixed(2)}%
                  </div>
                </td>

                {/* Market Value */}
                <td className="py-3.5 px-3 font-mono font-bold text-foreground">
                  Rs. {npr(h.market_value)}
                </td>

                {/* Unrealized P/L */}
                <td className="py-3.5 px-3">
                  <div className={`font-mono font-bold ${signClass(unPnl)}`}>
                    {unPnl >= 0 ? "+" : ""}Rs. {npr(unPnl)}
                  </div>
                  <div className={`text-[10px] font-mono font-semibold ${signClass(unPnlPct)}`}>
                    ({unPnlPct >= 0 ? "+" : ""}{unPnlPct.toFixed(2)}%)
                  </div>
                </td>

                {/* Weight % */}
                <td className="py-3.5 px-3 font-mono text-muted-foreground">
                  {h.weight_pct?.toFixed(1) ?? "—"}%
                </td>

                {/* AI Signal Pill */}
                <td className="py-3.5 px-3 text-center">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                      isBuy
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                        : isSell
                        ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    <span>{isBuy ? "🟢" : isSell ? "🔴" : "🟡"}</span>
                    <span>{isBuy ? "BUY" : isSell ? "SELL" : "WAIT"}</span>
                  </span>
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() =>
                        onOpenTxnModal({
                          symbol: sym,
                          type: "BUY",
                          rate: String(h.ltp || h.wacc),
                          qty: Math.max(10, Math.floor(h.qty * 0.5)),
                        })
                      }
                      title="Buy More units"
                      className="rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 text-[11px] font-bold transition-colors"
                    >
                      + Buy
                    </button>
                    <button
                      onClick={() =>
                        onOpenTxnModal({
                          symbol: sym,
                          type: "SELL",
                          rate: String(h.ltp || h.wacc),
                          qty: h.qty,
                        })
                      }
                      title="Sell / Trim units"
                      className="rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 px-2 py-1 text-[11px] font-bold transition-colors"
                    >
                      − Sell
                    </button>
                    <Link
                      href={`/chart?symbol=${sym}`}
                      title="Open Interactive Chart"
                      className="rounded-lg bg-surface border border-border/70 hover:bg-muted/40 p-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      📊
                    </Link>
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${sym} from portfolio?`)) {
                          onRemoveHolding(sym);
                        }
                      }}
                      title="Delete holding"
                      className="rounded-lg hover:bg-rose-500/10 p-1 text-muted-foreground hover:text-rose-600 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
