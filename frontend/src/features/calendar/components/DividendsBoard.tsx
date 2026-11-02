"use client";

import { useState } from "react";
import Link from "next/link";
import { useBookClosures, useDividends, useRights } from "../hooks/useCalendar";
import type { DividendEvent } from "../types";
import { TableContainer } from "@/shared/ui";

const TABS = ["Upcoming book closures", "Dividend history", "Right shares"] as const;

function Table({ rows, cols }: { rows: DividendEvent[]; cols: ("div" | "right")[] }) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground py-6 text-center">Nothing listed for this period.</p>;
  }

  return (
    <TableContainer maxHeight="32rem" scrollHint>
      <table className="min-w-full text-xs text-left">
        <thead className="sticky top-0 z-10 bg-card border-b border-border/80 text-[10px] uppercase font-bold text-muted-foreground shadow-2xs">
          <tr>
            <th className="py-2.5 px-3">Symbol</th>
            <th className="py-2.5 px-3">Company</th>
            <th className="py-2.5 px-3">FY (BS)</th>
            {cols.includes("div") && <th className="py-2.5 px-3 text-right">Bonus %</th>}
            {cols.includes("div") && <th className="py-2.5 px-3 text-right">Cash %</th>}
            {cols.includes("right") && <th className="py-2.5 px-3">Right ratio</th>}
            <th className="py-2.5 px-3">Book closure</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {rows.map((r) => (
            <tr key={`${r.symbol}-${r.fy_bs}-${r.book_closure_date}`} className="hover:bg-muted/30 transition-colors">
              <td className="py-2.5 px-3 font-mono font-bold text-primary">
                <Link href={`/company/${encodeURIComponent(r.symbol)}`} className="hover:underline">
                  {r.symbol}
                </Link>
              </td>
              <td className="py-2.5 px-3 text-foreground truncate max-w-[180px] sm:max-w-none">{r.name}</td>
              <td className="py-2.5 px-3 tabular-nums font-mono text-muted-foreground">{r.fy_bs}</td>
              {cols.includes("div") && (
                <td className="py-2.5 px-3 text-right tabular-nums font-mono text-blue-600 dark:text-blue-400 font-semibold">
                  {r.bonus_pct ? `${r.bonus_pct}%` : "—"}
                </td>
              )}
              {cols.includes("div") && (
                <td className="py-2.5 px-3 text-right tabular-nums font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  {r.cash_pct ? `${r.cash_pct}%` : "—"}
                </td>
              )}
              {cols.includes("right") && <td className="py-2.5 px-3 font-mono">{r.right_ratio ?? "—"}</td>}
              <td className="py-2.5 px-3 tabular-nums font-mono text-muted-foreground">{r.book_closure_date ?? "TBA"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableContainer>
  );
}

export function DividendsBoard() {
  const [tab, setTab] = useState(0);
  const [symbol, setSymbol] = useState("");
  const sym = symbol.trim().toUpperCase() || undefined;
  const closures = useBookClosures(90);
  const dividends = useDividends(sym);
  const rights = useRights(sym);
  const active = [closures, dividends, rights][tab];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {TABS.map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(i)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                i === tab
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab > 0 && (
          <div className="relative w-full sm:w-48">
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Filter by symbol…"
              className="w-full rounded-xl border border-input bg-card px-3 py-1.5 text-xs font-mono font-bold uppercase placeholder:font-normal placeholder:capitalize text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {symbol && (
              <button
                onClick={() => setSymbol("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {active.error ? (
        <p className="text-xs text-rose-600 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
          Data unavailable: {active.error.message}
        </p>
      ) : active.isLoading ? (
        <div className="py-8 space-y-2 animate-pulse">
          <div className="h-10 rounded-xl bg-muted/40" />
          <div className="h-10 rounded-xl bg-muted/30" />
          <div className="h-10 rounded-xl bg-muted/20" />
        </div>
      ) : (
        <Table rows={active.data ?? []} cols={tab === 0 ? ["div", "right"] : tab === 1 ? ["div"] : ["right"]} />
      )}
    </div>
  );
}
