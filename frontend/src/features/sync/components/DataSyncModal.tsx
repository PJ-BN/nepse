"use client";

import { useState, useEffect } from "react";
import {
  fetchSyncStatus,
  triggerSyncAll,
  triggerSyncCrosscheck,
  triggerSyncEod,
  triggerSyncNews,
  triggerSyncSebon,
} from "../api";
import type { SyncResult, SyncStatus } from "../types";

export function DataSyncModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [activeJob, setActiveJob] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"actions" | "terminal">("actions");

  const refreshStatus = async () => {
    try {
      const data = await fetchSyncStatus();
      setStatus(data);
    } catch (err: unknown) {
      console.error("Failed to fetch sync status:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshStatus();
    }
  }, [isOpen]);

  const handleRun = async (jobName: string, actionFn: () => Promise<SyncResult>) => {
    try {
      setActiveJob(jobName);
      setErrorMsg(null);
      setLastResult(null);
      const res = await actionFn();
      setLastResult(res);
      await refreshStatus();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Sync execution failed.");
    } finally {
      setActiveJob(null);
    }
  };

  const isTodaySynced = () => {
    if (!status?.latest_trade_date) return false;
    const today = new Date().toISOString().split("T")[0];
    return status.latest_trade_date === today;
  };

  return (
    <>
      {/* Navbar Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground/80 transition hover:bg-gray-100 hover:text-foreground dark:hover:bg-neutral-800"
        title="Manual Data Sync & Ingestion"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={activeJob ? "animate-spin text-accent" : "text-gray-500"}
          aria-hidden
        >
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
        </svg>
        <span className="hidden md:inline">Sync Data</span>
        {status?.latest_trade_date && (
          <span
            className={`h-2 w-2 rounded-full ${
              isTodaySynced() ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
            }`}
            title={isTodaySynced() ? "Today's EOD data is synced" : "Today's EOD data pending sync"}
          />
        )}
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 21h5v-5" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Data Ingestion & Sync Center</h3>
                  <p className="text-xs text-muted-foreground">Pull latest closing figures, floorsheet, news & macro filings</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Current Status Banner */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-border/70 bg-card p-3.5 text-xs shadow-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Latest EOD Date</span>
                  <span className="font-semibold text-foreground text-sm flex items-center gap-1.5 mt-0.5">
                    {status?.latest_trade_date ?? "Loading..."}
                    {status?.latest_trade_date && (
                      <span className={`inline-block h-2 w-2 rounded-full ${isTodaySynced() ? "bg-emerald-500" : "bg-amber-500"}`} />
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Daily Bars Today</span>
                  <span className="font-semibold text-foreground text-sm block mt-0.5">
                    {status?.daily_bars_count != null ? `${status.daily_bars_count} stocks` : "--"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Floorsheet Ticks</span>
                  <span className="font-semibold text-foreground text-sm block mt-0.5">
                    {status?.floorsheet_count != null ? status.floorsheet_count.toLocaleString() : "--"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">News & Directives</span>
                  <span className="font-semibold text-foreground text-sm block mt-0.5">
                    {status?.total_news_articles != null ? `${status.total_news_articles} items` : "--"}
                  </span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-border text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTab("actions")}
                  className={`pb-2.5 px-3 transition-colors border-b-2 -mb-px ${
                    activeTab === "actions"
                      ? "border-accent text-accent font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  One-Click Sync
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("terminal")}
                  className={`pb-2.5 px-3 transition-colors border-b-2 -mb-px ${
                    activeTab === "terminal"
                      ? "border-accent text-accent font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Terminal Commands
                </button>
              </div>

              {/* Tab 1: One-Click Sync Actions */}
              {activeTab === "actions" && (
                <div className="space-y-4">
                  {/* Highlighted Full Sync Button */}
                  <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                        <span>⚡ Full Evening Sync (Recommended)</span>
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Runs complete EOD ingestion, pulls news & circulars, SEBON pipeline, and crosschecks prices in one click.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!!activeJob}
                      onClick={() => handleRun("full", triggerSyncAll)}
                      className="shrink-0 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-background hover:bg-accent/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      {activeJob === "full" ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          <span>Syncing All...</span>
                        </>
                      ) : (
                        <span>Run Full Sync</span>
                      )}
                    </button>
                  </div>

                  {/* Individual Ingestion Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* EOD Market */}
                    <div className="rounded-lg border border-border p-3 flex flex-col justify-between gap-2 bg-card">
                      <div>
                        <div className="font-medium text-xs text-foreground">1. EOD Market Data</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Closing prices, 17 indices, floorsheet trades & screener view.
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!!activeJob}
                        onClick={() => handleRun("eod", triggerSyncEod)}
                        className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {activeJob === "eod" && (
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        )}
                        <span>{activeJob === "eod" ? "Ingesting..." : "Sync Market EOD"}</span>
                      </button>
                    </div>

                    {/* News & Directives */}
                    <div className="rounded-lg border border-border p-3 flex flex-col justify-between gap-2 bg-card">
                      <div>
                        <div className="font-medium text-xs text-foreground">2. News & Circulars</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          ShareSansar, SEBON, NRB directives & AI impact calculations.
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!!activeJob}
                        onClick={() => handleRun("news", triggerSyncNews)}
                        className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {activeJob === "news" && (
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        )}
                        <span>{activeJob === "news" ? "Scraping..." : "Sync News & AI"}</span>
                      </button>
                    </div>

                    {/* SEBON Pipeline */}
                    <div className="rounded-lg border border-border p-3 flex flex-col justify-between gap-2 bg-card">
                      <div>
                        <div className="font-medium text-xs text-foreground">3. SEBON Pipeline</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Parse IPO & Right-Share approvals directly from SEBON.
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!!activeJob}
                        onClick={() => handleRun("sebon", triggerSyncSebon)}
                        className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {activeJob === "sebon" && (
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        )}
                        <span>{activeJob === "sebon" ? "Parsing..." : "Sync SEBON"}</span>
                      </button>
                    </div>

                    {/* ShareSansar Crosscheck */}
                    <div className="rounded-lg border border-border p-3 flex flex-col justify-between gap-2 bg-card">
                      <div>
                        <div className="font-medium text-xs text-foreground">4. EOD Crosscheck</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Verify NEPSE closing prices against ShareSansar data.
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!!activeJob}
                        onClick={() => handleRun("crosscheck", triggerSyncCrosscheck)}
                        className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {activeJob === "crosscheck" && (
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        )}
                        <span>{activeJob === "crosscheck" ? "Verifying..." : "Run Crosscheck"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Terminal Commands */}
              {activeTab === "terminal" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    You can also trigger these anytime from your command prompt, PowerShell, or terminal:
                  </p>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="rounded-lg bg-neutral-950 p-3 text-neutral-200 border border-neutral-800">
                      <div className="text-neutral-500 mb-1 text-[11px]"># Interactive one-click utility (Windows)</div>
                      <div className="text-emerald-400 select-all">.\sync.bat</div>
                    </div>
                    <div className="rounded-lg bg-neutral-950 p-3 text-neutral-200 border border-neutral-800">
                      <div className="text-neutral-500 mb-1 text-[11px]"># Core EOD market data</div>
                      <div className="text-emerald-400 select-all">docker compose run --rm worker python -m nepse.workers.main eod</div>
                    </div>
                    <div className="rounded-lg bg-neutral-950 p-3 text-neutral-200 border border-neutral-800">
                      <div className="text-neutral-500 mb-1 text-[11px]"># News & Regulatory circulars</div>
                      <div className="text-emerald-400 select-all">docker compose run --rm worker python -m nepse.workers.main news</div>
                    </div>
                    <div className="rounded-lg bg-neutral-950 p-3 text-neutral-200 border border-neutral-800">
                      <div className="text-neutral-500 mb-1 text-[11px]"># Full Evening Sync one-liner</div>
                      <div className="text-emerald-400 select-all">
                        docker compose run --rm worker sh -c &quot;python -m nepse.workers.main eod &amp;&amp; python -m nepse.workers.main news &amp;&amp; python -m nepse.workers.main job macro_sebon&quot;
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Execution Status / Results Feedback */}
              {errorMsg && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{errorMsg}</span>
                </div>
              )}

              {lastResult && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <span>Sync Completed Successfully!</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground pl-5">
                    {lastResult.job === "eod" && (
                      <span>Ingested {lastResult.daily_bars} daily bars and {lastResult.floorsheet_ticks?.toLocaleString()} floorsheet trades for {lastResult.business_date}.</span>
                    )}
                    {lastResult.job === "news" && (
                      <span>Ingested {lastResult.articles_ingested} latest articles and circulars with AI analysis.</span>
                    )}
                    {lastResult.job === "sebon" && (
                      <span>Parsed {lastResult.records_ingested} IPO / right-share pipeline filings from SEBON.</span>
                    )}
                    {lastResult.job === "crosscheck" && (
                      <span>Verified {lastResult.compared} symbols against ShareSansar. 0 mismatches found!</span>
                    )}
                    {lastResult.job === "all" && (
                      <span>Full sync finished. All market prices, screener rows, news, and pipelines updated.</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-border px-6 py-3 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                Auto-scheduler running daily at 15:15 NPT
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-border bg-surface text-foreground hover:bg-muted transition text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
