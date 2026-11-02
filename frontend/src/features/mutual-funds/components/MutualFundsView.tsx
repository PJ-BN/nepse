"use client";

import Link from "next/link";
import { useMutualFunds } from "../hooks/useMutualFunds";
import { TableContainer } from "@/shared/ui";

const num = (v: number | null, d = 2) => (v === null ? "—" : v.toFixed(d));

export function MutualFundsView() {
  const { data, error, isLoading } = useMutualFunds();

  if (isLoading) {
    return (
      <div className="py-8 space-y-2 animate-pulse">
        <div className="h-10 rounded-xl bg-muted/40" />
        <div className="h-10 rounded-xl bg-muted/30" />
        <div className="h-10 rounded-xl bg-muted/20" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs text-rose-600 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
        Mutual funds data unavailable: {error.message}
      </p>
    );
  }

  const flaggedCount = data?.filter((f) => f.flagged).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
        <p className="text-xs text-muted-foreground">
          Highlighted rows indicate arbitrage setups: trading <strong className="text-foreground">&gt;15% below NAV</strong> with maturity within 12 months.
        </p>
        {flaggedCount > 0 && (
          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono shrink-0">
            {flaggedCount} Arbitrage Opportunities
          </span>
        )}
      </div>

      <TableContainer scrollHint>
        <table className="min-w-full text-xs text-left tabular-nums">
          <thead className="bg-muted/20 border-b border-border/60 text-[10px] uppercase font-bold text-muted-foreground">
            <tr>
              <th className="py-2.5 px-3">Symbol</th>
              <th className="py-2.5 px-3">Scheme Name</th>
              <th className="py-2.5 px-3 text-right">LTP (NPR)</th>
              <th className="py-2.5 px-3 text-right">NAV</th>
              <th className="py-2.5 px-3 text-right">Discount %</th>
              <th className="py-2.5 px-3">Maturity Date</th>
              <th className="py-2.5 px-3 text-right">Days Left</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-mono">
            {data?.map((f) => {
              const isDiscount = (f.nav_discount_pct ?? 0) > 0;
              return (
                <tr
                  key={f.symbol}
                  className={`transition-colors ${
                    f.flagged
                      ? "bg-emerald-500/10 hover:bg-emerald-500/15 font-semibold"
                      : "hover:bg-muted/30"
                  }`}
                >
                  <td className="py-2.5 px-3 font-bold text-primary">
                    <Link href={`/chart?symbol=${encodeURIComponent(f.symbol)}`} className="hover:underline">
                      {f.symbol}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 font-sans text-foreground truncate max-w-[200px] sm:max-w-none">
                    {f.name}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-foreground">
                    {num(f.ltp)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground">
                    {num(f.nav)}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-bold ${
                    isDiscount ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}>
                    {isDiscount ? `-${num(f.nav_discount_pct, 1)}%` : `+${num(Math.abs(f.nav_discount_pct ?? 0), 1)}%`}
                  </td>
                  <td className="py-2.5 px-3 font-sans text-muted-foreground">
                    {f.maturity_date ?? "Open-Ended"}
                  </td>
                  <td className="py-2.5 px-3 text-right text-foreground">
                    {f.days_to_maturity ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableContainer>
    </div>
  );
}
