"use client";

import type { Txn } from "../types";
import { npr } from "./format";

export function TxnLedger({
  transactions,
  onDeleteTxn,
}: {
  transactions: Txn[];
  onDeleteTxn: (id: string | number) => void;
}) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card p-8 text-center text-xs text-muted-foreground">
        No transactions recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-xs">
      <table className="w-full text-right text-xs">
        <thead className="bg-surface/60 border-b border-border/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="py-3 px-4 text-left">Date</th>
            <th className="py-3 px-3 text-left">Symbol</th>
            <th className="py-3 px-3 text-center">Type</th>
            <th className="py-3 px-3">Units</th>
            <th className="py-3 px-3">Rate</th>
            <th className="py-3 px-3">Fees</th>
            <th className="py-3 px-3">Total NPR</th>
            <th className="py-3 px-4 text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60 font-mono">
          {transactions.map((t) => {
            const isBuy = t.txn_type === "BUY" || t.txn_type === "IPO" || t.txn_type === "RIGHT";
            const isSell = t.txn_type === "SELL";
            const totalFee = t.fees ? Object.values(t.fees).reduce((sum, f) => sum + Number(f || 0), 0) : 0;

            return (
              <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                <td className="py-3 px-4 text-left font-sans text-muted-foreground">{t.txn_date}</td>
                <td className="py-3 px-3 text-left font-bold text-foreground">{t.symbol}</td>
                <td className="py-3 px-3 text-center">
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      isBuy
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        : isSell
                        ? "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                        : "bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {t.txn_type}
                  </span>
                </td>
                <td className="py-3 px-3 text-foreground font-medium">{t.qty.toLocaleString()}</td>
                <td className="py-3 px-3 text-muted-foreground">Rs. {npr(t.rate)}</td>
                <td className="py-3 px-3 text-muted-foreground">Rs. {npr(totalFee)}</td>
                <td className="py-3 px-3 font-bold text-foreground">
                  Rs. {npr(t.total_payable || t.net_receivable || Number(t.rate) * t.qty)}
                </td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() => onDeleteTxn(t.id)}
                    title="Delete transaction"
                    className="rounded-lg p-1 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 transition-colors"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
