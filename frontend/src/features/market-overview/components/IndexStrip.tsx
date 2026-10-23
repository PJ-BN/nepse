"use client";

import { fmt, fmtPct } from "../format";
import type { IndexValue } from "../types";

const SECTOR_NAMES: Record<string, string> = {
  NEPSE: "Benchmark Index",
  BANKING: "Commercial Banks",
  DEVBANK: "Development Banks",
  FINANCE: "Finance Companies",
  MICROFIN: "Microfinance",
  LIFEINSU: "Life Insurance",
  NONLIFE: "Non-Life Insurance",
  HYDRO: "Hydropower",
  MANUFAC: "Manufacturing",
  HOTEL: "Hotels & Tourism",
  TRADING: "Trading",
  INVEST: "Investment",
  OTHERS: "Others",
  MUTUAL: "Mutual Funds",
};

export function IndexStrip({
  index,
  subIndices,
}: {
  index: IndexValue | null;
  subIndices: IndexValue[];
}) {
  const allIndices = [...(index ? [index] : []), ...subIndices];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
            Sector Indices & Benchmarks
          </span>
          <span className="text-[11px] rounded-full bg-muted/40 border border-border/60 px-2 py-0.5 text-muted-foreground font-mono">
            {allIndices.length} Indices
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
        {allIndices.map((i) => {
          const isMain = i.code === "NEPSE";
          const isPositive = i.change > 0;
          const isNegative = i.change < 0;

          const changeColor = isPositive
            ? "text-emerald-600 dark:text-emerald-400"
            : isNegative
            ? "text-rose-600 dark:text-rose-400"
            : "text-muted-foreground";

          const pillBg = isPositive
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
            : isNegative
            ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
            : "bg-muted/40 text-muted-foreground border-border/50";

          return (
            <div
              key={i.code}
              className={`group relative flex flex-col justify-between rounded-xl border p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs ${
                isMain
                  ? "border-primary/50 bg-gradient-to-b from-primary/10 via-card to-card shadow-xs ring-1 ring-primary/20 col-span-2 sm:col-span-1 xl:col-span-1"
                  : "border-border/75 bg-card/70 hover:bg-card hover:border-border"
              }`}
            >
              {/* Header: Code & Benchmark/Sector tag */}
              <div className="flex items-start justify-between gap-1.5">
                <div className="truncate">
                  <span
                    className={`text-xs font-bold tracking-tight block truncate ${
                      isMain ? "text-primary font-extrabold" : "text-foreground"
                    }`}
                  >
                    {i.code}
                  </span>
                  <span className="text-[10px] text-muted-foreground block truncate">
                    {SECTOR_NAMES[i.code] ?? "Sector"}
                  </span>
                </div>

                {isMain ? (
                  <span className="shrink-0 rounded-md bg-primary/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-primary border border-primary/30">
                    BENCHMARK
                  </span>
                ) : (
                  <span
                    className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-mono font-bold ${pillBg}`}
                  >
                    {fmtPct(i.pct_change)}
                  </span>
                )}
              </div>

              {/* Price & Change details */}
              <div className="mt-2.5 pt-2 border-t border-border/40 flex items-baseline justify-between gap-1">
                <div className="font-mono text-base font-extrabold tracking-tight text-foreground">
                  {fmt(i.value)}
                </div>

                {isMain ? (
                  <span
                    className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-mono font-bold ${pillBg}`}
                  >
                    {fmtPct(i.pct_change)}
                  </span>
                ) : (
                  <div className={`font-mono text-[11px] font-semibold flex items-center gap-0.5 ${changeColor}`}>
                    <span>{isPositive ? "▲" : isNegative ? "▼" : "•"}</span>
                    <span>{fmt(Math.abs(i.change))}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
