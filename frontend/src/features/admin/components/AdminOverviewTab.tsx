"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAdminOverview } from "../api";

export function AdminOverviewTab({ onSwitchTab }: { onSwitchTab: (tab: string) => void }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: fetchAdminOverview,
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-muted/40" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-muted/30" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-500">
        Failed to load administrative overview: {(error as Error)?.message || "Network error"}
      </div>
    );
  }

  const { total_users, data_sources, daily_evening_job, token_usage, database } = data;

  return (
    <div className="space-y-6">
      {/* Top Telemetry Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registered Users</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary text-sm font-bold">
              👥
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-foreground">{total_users}</div>
          <button
            onClick={() => onSwitchTab("users")}
            className="mt-2 text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            Manage users & roles →
          </button>
        </div>

        {/* Data Sources Health */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data Connectors</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500 text-sm font-bold">
              ⚡
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground">{data_sources.healthy}</span>
            <span className="text-xs text-muted-foreground">/ {data_sources.total} healthy</span>
          </div>
          <button
            onClick={() => onSwitchTab("data-sources")}
            className="mt-2 text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            Inspect data origins →
          </button>
        </div>

        {/* 4:00 PM Master AI Pipeline Status */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Daily 4 PM Master Run</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/15 text-purple-500 text-sm font-bold">
              🤖
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-2xl font-extrabold text-foreground">{daily_evening_job.schedule_time_npt} NPT</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                daily_evening_job.last_status === "SUCCESS"
                  ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                  : daily_evening_job.last_status === "RUNNING"
                  ? "bg-blue-500/15 text-blue-500 animate-pulse"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {daily_evening_job.last_status}
            </span>
          </div>
          <button
            onClick={() => onSwitchTab("schedules")}
            className="mt-2 text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            Adjust time or run manually →
          </button>
        </div>

        {/* Token Spend & Cost Telemetry */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Spend Telemetry</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 text-sm font-bold">
              💰
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-foreground">
            ${token_usage.total_cost_usd.toFixed(4)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {token_usage.total_tokens.toLocaleString()} tokens across {token_usage.total_runs} runs
          </div>
        </div>
      </div>

      {/* Main Status & Control Hero */}
      <div className="rounded-3xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card to-card p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 animate-ping rounded-full bg-emerald-500" />
              <h2 className="text-lg font-bold text-foreground">Admin Central Intelligence Node</h2>
              <span className="rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">LIVE</span>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Every day at <strong>4:00 PM (16:00 NPT)</strong> after trading session close, this system executes
              the automated pipeline: EOD Data Ingestion → Macro Read Agent → AI Trade Agent → AI Watchlist Agent.
              The resulting evaluations are saved to the persistent database and hot-cached so all regular visitors
              instantly view institutional-grade intelligence without burning duplicate LLM tokens.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onSwitchTab("schedules")}
              className="rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-background transition-opacity hover:opacity-90 cursor-pointer shadow-xs"
            >
              🚀 Manual Evening Sync Room
            </button>
            <button
              onClick={() => refetch()}
              className="rounded-xl border border-border/80 bg-surface/80 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
            >
              ↻ Refresh Telemetry
            </button>
          </div>
        </div>
      </div>

      {/* Database State Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/80 bg-card p-4">
          <div className="text-xs text-muted-foreground">Active Companies</div>
          <div className="mt-1 text-xl font-bold text-foreground">{database.active_companies}</div>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-4">
          <div className="text-xs text-muted-foreground">Daily OHLCV Bars</div>
          <div className="mt-1 text-xl font-bold text-foreground">{database.daily_bars_count.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-4">
          <div className="text-xs text-muted-foreground">News Articles</div>
          <div className="mt-1 text-xl font-bold text-foreground">{database.total_news.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-4">
          <div className="text-xs text-muted-foreground">Latest Ingested Trade Date</div>
          <div className="mt-1 text-xl font-bold font-mono text-emerald-500">
            {database.latest_trade_date || "None"}
          </div>
        </div>
      </div>
    </div>
  );
}
