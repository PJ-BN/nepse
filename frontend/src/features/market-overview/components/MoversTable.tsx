"use client";

import Link from "next/link";
import { fmt, fmtCrore, fmtPct } from "../format";
import type { Quote } from "../types";

export function MoversTable({
  title,
  rows,
  showTurnover = false,
}: {
  title: string;
  rows: Quote[];
  showTurnover?: boolean;
}) {
  const isGainers = title.toLowerCase().includes("gainer");
  const isLosers = title.toLowerCase().includes("loser");
  const isTurnover = showTurnover || title.toLowerCase().includes("turnover");

  const icon = isGainers ? "🚀" : isLosers ? "🔻" : "⚡";
  const iconBg = isGainers
    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
    : isLosers
    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25"
    : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25";

  return (
    <section className="flex flex-col rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden transition-all duration-200 hover:border-border">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/15 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-6 w-6 items-center justify-center rounded-lg border text-xs shadow-2xs ${iconBg}`}>
            {icon}
          </span>
          <h2 className="text-sm font-bold tracking-tight text-foreground">{title}</h2>
        </div>
        <span className="rounded-full bg-muted/40 border border-border/50 px-2 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground">
          {rows.length} Active
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-b border-border/50 bg-muted/10 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
            <tr>
              <th className="py-2.5 pl-4 pr-1 text-left w-7">#</th>
              <th className="py-2.5 px-3 text-left">Symbol</th>
              <th className="py-2.5 px-3 text-right">LTP</th>
              <th className="py-2.5 pr-4 pl-2 text-right">{isTurnover ? "Turnover" : "Change"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.map((q, idx) => {
              const rank = idx + 1;
              const isPositive = q.pct_change > 0;
              const isNegative = q.pct_change < 0;

              // Rank styling for podium 1, 2, 3
              const rankBadge =
                rank === 1
                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/30"
                  : rank === 2
                  ? "bg-slate-400/20 text-slate-700 dark:text-slate-300 font-bold border border-slate-400/30"
                  : rank === 3
                  ? "bg-amber-700/20 text-amber-800 dark:text-amber-500 font-bold border border-amber-700/30"
                  : "text-muted-foreground font-medium";

              return (
                <tr
                  key={q.symbol}
                  className="transition-colors hover:bg-muted/30 group"
                >
                  {/* Rank */}
                  <td className="py-2.5 pl-4 pr-1">
                    <span
                      className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${rankBadge}`}
                    >
                      {rank}
                    </span>
                  </td>

                  {/* Symbol link */}
                  <td className="py-2.5 px-3">
                    <Link
                      href={`/chart?symbol=${encodeURIComponent(q.symbol)}`}
                      className="font-mono font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      <span>{q.symbol}</span>
                    </Link>
                  </td>

                  {/* LTP */}
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-foreground">
                    {fmt(q.ltp)}
                  </td>

                  {/* Change / Turnover */}
                  <td className="py-2.5 pr-4 pl-2 text-right font-mono">
                    {isTurnover ? (
                      <span className="font-semibold text-foreground">
                        {fmtCrore(q.turnover)}
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center justify-end px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                          isPositive
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                            : isNegative
                            ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                            : "bg-muted/30 text-muted-foreground border-border/50"
                        }`}
                      >
                        {fmtPct(q.pct_change)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-muted-foreground">
                  No active securities recorded
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
