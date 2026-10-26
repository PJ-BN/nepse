"use client";

import Link from "next/link";
import { useState } from "react";
import { useCompanyNews } from "../hooks/useNews";
import type { NewsItem } from "../types";
import { NewsImpactModal } from "./NewsImpactModal";

export function CompanyNewsSection({ symbol }: { symbol: string }) {
  const { data, isLoading, error } = useCompanyNews(symbol, 5);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  if (isLoading) {
    return (
      <section className="space-y-3 rounded-2xl border p-5 bg-card">
        <div className="h-5 w-48 bg-muted animate-pulse rounded" />
        <div className="h-20 w-full bg-muted/50 animate-pulse rounded-xl" />
      </section>
    );
  }

  if (error || !data || data.length === 0) {
    return (
      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-foreground">Company News & Notices for {symbol}</h2>
          <Link href={`/news?symbol=${symbol}`} className="text-xs text-primary hover:underline">
            View all news &rarr;
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          No recent corporate announcements or regulatory notices recorded specifically for {symbol}.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 text-sm">
              📰
            </span>
            <h2 className="text-base font-bold text-foreground tracking-tight">
              Latest News & Catalysts for {symbol}
            </h2>
            <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-xs font-bold">
              {data.length} updates
            </span>
          </div>

          <Link
            href={`/news?symbol=${symbol}`}
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
          >
            Explore in Dedicated News Section &rarr;
          </Link>
        </div>

        <div className="grid gap-3">
          {data.map((item) => {
            const isBull = item.impact_stance === "BULLISH";
            const isBear = item.impact_stance === "BEARISH";

            return (
              <div
                key={item.id || item.source_url}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border bg-muted/20 hover:bg-muted/40 p-3.5 transition-colors"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span
                      className={`rounded-full px-2 py-0.5 font-bold uppercase ${
                        isBull
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                          : isBear
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25"
                      }`}
                    >
                      {item.impact_stance}
                    </span>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground uppercase font-medium">
                      {item.category}
                    </span>
                    <span className="text-muted-foreground">{item.source}</span>
                    <span className="text-muted-foreground tabular-nums">&bull; {item.published_on}</span>
                  </div>

                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    <a href={item.source_url} target="_blank" rel="noreferrer" className="hover:underline">
                      {item.title}
                    </a>
                  </h3>

                  {/* What to do snippet */}
                  <div className="text-xs text-foreground/80 flex items-center gap-1.5 pt-0.5">
                    <span className="font-bold text-primary">Verdict:</span>
                    <span className="font-medium">{item.action_recommendation}</span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedNews(item)}
                    className="rounded-lg bg-card border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    Impact Details
                  </button>
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Link &nearr;
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <NewsImpactModal
        isOpen={Boolean(selectedNews)}
        onClose={() => setSelectedNews(null)}
        newsItem={selectedNews}
        aiData={null}
        isLoading={false}
      />
    </>
  );
}
