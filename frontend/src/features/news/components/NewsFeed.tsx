"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAnalyzeNews, useNews, useNewsBriefing } from "../hooks/useNews";
import type { NewsCategory, NewsItem } from "../types";
import { NewsAiBriefing } from "./NewsAiBriefing";
import { NewsCard } from "./NewsCard";

const CATEGORIES: { id: NewsCategory; label: string; icon: string }[] = [
  { id: "all", label: "All News & Bulletins", icon: "🌐" },
  { id: "regulatory", label: "Regulatory & SEBON", icon: "⚖️" },
  { id: "government", label: "Government & Tax", icon: "🏛️" },
  { id: "company", label: "Company Disclosures", icon: "🏢" },
  { id: "macro", label: "Monetary Policy & NRB", icon: "📈" },
  { id: "sector", label: "Sector Intelligence", icon: "⚡" },
];

const STANCES = [
  { id: "ALL", label: "All Impacts" },
  { id: "BULLISH", label: "🚀 Bullish / Buy Catalysts" },
  { id: "NEUTRAL", label: "💡 Neutral / Watch" },
  { id: "BEARISH", label: "⚠️ Bearish / Caution" },
];

export function NewsFeed() {
  const searchParams = useSearchParams();
  const initialSymbol = searchParams.get("symbol") || "";
  const initialCategory = searchParams.get("category") || "all";

  const [category, setCategory] = useState<string>(initialCategory);
  const [symbol, setSymbol] = useState<string>(initialSymbol);
  const [stance, setStance] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  useEffect(() => {
    if (initialSymbol) {
      setSymbol(initialSymbol);
    }
    if (initialCategory) {
      setCategory(initialCategory);
    }
  }, [initialSymbol, initialCategory]);

  const { data, isLoading, isFetching, refetch } = useNews({
    category,
    symbol,
    stance,
    search: search.trim() || undefined,
    page,
    limit,
  });

  const { data: briefing, isLoading: briefingLoading, refetch: refetchBriefing } = useNewsBriefing();
  const analyzeMutation = useAnalyzeNews();

  const handleSelectSymbol = (sym: string) => {
    setSymbol(sym);
    setPage(1);
  };

  const handleClearSymbol = () => {
    setSymbol("");
    setPage(1);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30 text-base">
              📰
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              NEPSE News & Regulatory Intelligence
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground pt-1">
            Real-time corporate actions, SEBON circulars, and NRB policies paired with AI investment impact and timing advice.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              refetch();
              refetchBriefing();
            }}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-xl border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted/80 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <span>🔄</span>
            <span>{isFetching ? "Refreshing…" : "Refresh Feed"}</span>
          </button>
        </div>
      </div>

      {/* AI Market & Regulatory Executive Briefing */}
      <NewsAiBriefing
        briefing={briefing}
        isLoading={briefingLoading}
        onRefresh={() => refetchBriefing()}
      />

      {/* Filter and Search Controls */}
      <div className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5 shadow-xs">
        {/* Search Bar + Symbol Input */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8 relative">
            <input
              type="text"
              placeholder="Search news headline, regulation keyword, circular, dividend..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>

          <div className="sm:col-span-4 relative">
            <input
              type="text"
              placeholder="Filter by Symbol (e.g. NABIL, EBL)"
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value.toUpperCase());
                setPage(1);
              }}
              className="w-full rounded-xl border bg-background px-3.5 py-2 text-sm font-semibold tracking-wider text-foreground placeholder:text-muted-foreground uppercase focus:outline-hidden focus:ring-2 focus:ring-primary/40 transition-all"
            />
            {symbol && (
              <button
                onClick={handleClearSymbol}
                className="absolute right-3 top-2.5 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {CATEGORIES.map((cat) => {
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategory(cat.id);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Impact Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
              Impact Stance:
            </span>
            {STANCES.map((s) => {
              const active = stance === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setStance(s.id);
                    setPage(1);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? "bg-foreground text-background font-bold"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Active filters pill */}
          {symbol && (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/25 px-2.5 py-1 text-xs font-semibold text-primary">
              <span>Stock: {symbol}</span>
              <button onClick={handleClearSymbol} className="hover:opacity-75 font-bold cursor-pointer">
                &times;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Feed Status & Count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Showing <strong>{data?.items.length || 0}</strong> of <strong>{data?.total || 0}</strong> news items
        </span>
        {isFetching && <span className="animate-pulse">Loading updates…</span>}
      </div>

      {/* News List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-2xl border bg-card p-6 shadow-xs animate-pulse space-y-4">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-6 w-3/4 bg-muted rounded" />
              <div className="h-16 w-full bg-muted/60 rounded-xl" />
            </div>
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center space-y-3">
          <span className="text-3xl">🔍</span>
          <h3 className="text-base font-bold text-foreground">No matching news articles found</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Try adjusting your search keywords, clearing the stock symbol filter, or switching categories.
          </p>
          {(symbol || search || category !== "all" || stance !== "ALL") && (
            <button
              onClick={() => {
                setCategory("all");
                setSymbol("");
                setSearch("");
                setStance("ALL");
              }}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              Reset all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.items.map((newsItem: NewsItem) => (
            <NewsCard
              key={newsItem.id || newsItem.source_url}
              news={newsItem}
              onSelectSymbol={handleSelectSymbol}
              onAnalyze={(item) => analyzeMutation.mutateAsync(item)}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-xl border bg-card px-3.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
          >
            &larr; Previous
          </button>
          <span className="text-xs font-semibold text-muted-foreground px-2">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-xl border bg-card px-3.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
