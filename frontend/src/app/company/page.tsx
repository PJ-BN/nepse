"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchSymbols } from "@/features/charting";
import { PageContainer, PageHeader, ResponsiveCard } from "@/shared/ui";

export default function CompanyIndexPage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["company-search", debounced],
    queryFn: () => searchSymbols(debounced, 60),
  });

  return (
    <PageContainer maxWidth="standard">
      <div className="space-y-6">
        <PageHeader
          title="Listed Companies Directory"
          description="Browse fundamentals, quarterly financials, valuation multiples, and dividend histories for all NEPSE-listed equities."
          icon="🏢"
        />

        <ResponsiveCard>
          <div className="relative">
            <span className="absolute left-3.5 top-3 text-muted-foreground text-sm">🔍</span>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by symbol or company name (e.g., NABIL, Shiva, Banking)..."
              className="w-full rounded-xl border border-input bg-card pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-3.5 top-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>

          {error && (
            <p className="mt-4 text-xs font-semibold text-rose-600 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
              {error.message}
            </p>
          )}

          <div className="mt-4">
            {isLoading ? (
              <div className="space-y-2 py-4 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 rounded-xl bg-muted/40" />
                ))}
              </div>
            ) : data.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No listed companies match &ldquo;{debounced}&rdquo;.
              </div>
            ) : (
              <ul className="divide-y divide-border/60 text-sm">
                {data.map((s) => (
                  <li
                    key={s.symbol}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 py-3 hover:bg-muted/30 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface border border-border/80 font-black font-mono text-xs text-primary">
                        {s.symbol.slice(0, 3)}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/company/${encodeURIComponent(s.symbol)}`}
                          className="font-mono font-bold text-foreground hover:text-primary hover:underline text-sm sm:text-base block truncate"
                        >
                          {s.symbol}
                        </Link>
                        <p className="text-xs text-muted-foreground truncate" title={s.description}>
                          {s.description || s.symbol}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto pt-1 sm:pt-0">
                      <Link
                        href={`/company/${encodeURIComponent(s.symbol)}`}
                        className="rounded-lg border border-border/80 px-3 py-1.5 text-xs font-semibold hover:bg-muted text-foreground transition-colors"
                      >
                        Fundamentals
                      </Link>
                      <Link
                        href={`/chart?symbol=${encodeURIComponent(s.symbol)}`}
                        className="rounded-lg bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 text-xs font-semibold hover:bg-primary/20 transition-colors"
                      >
                        Chart 📈
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ResponsiveCard>
      </div>
    </PageContainer>
  );
}
