"use client";

import { useState } from "react";
import { useWhaleTrades } from "@/features/live-feed";
import { useBrokerAnalytics } from "../hooks/useFloorsheet";
import { WINDOWS } from "../types";
import { AccumulationScanner } from "./AccumulationScanner";
import { BrokerSankey } from "./BrokerSankey";
import { CostBasisMatrix } from "./CostBasisMatrix";
import { WhaleTape } from "./WhaleTape";
import { ResponsiveCard, TableContainer } from "@/shared/ui";

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export function FloorsheetDashboard({ initialSymbol = "" }: { initialSymbol?: string }) {
  const [draft, setDraft] = useState(initialSymbol);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [days, setDays] = useState<number>(30);
  const { data, error, isFetching } = useBrokerAnalytics(symbol, days);
  const liveWhales = useWhaleTrades();

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1fr_24rem] min-w-0">
      {/* Main Analysis Column */}
      <section className="space-y-5 min-w-0">
        <ResponsiveCard>
          <form
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setSymbol(draft.trim().toUpperCase());
            }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value.toUpperCase())}
                placeholder="Ticker (e.g. NABIL, SHIVM)"
                className="w-36 rounded-xl border border-input bg-card px-3 py-1.5 text-xs font-mono font-bold uppercase placeholder:font-normal placeholder:capitalize text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="submit"
                className="rounded-xl bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-90 transition-all cursor-pointer"
              >
                Load Analysis
              </button>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pt-1 sm:pt-0">
              <span className="text-[11px] font-bold text-muted-foreground mr-1 uppercase">Window:</span>
              {WINDOWS.map((w) => (
                <button
                  type="button"
                  key={w}
                  onClick={() => setDays(w)}
                  aria-pressed={days === w}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    days === w
                      ? "bg-foreground text-background font-bold shadow-2xs"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {w}D
                </button>
              ))}
            </div>
          </form>

          {isFetching && (
            <p className="text-xs text-muted-foreground font-mono mt-3 animate-pulse">
              Crunching broker transactions for {symbol || "all scrips"}…
            </p>
          )}

          {error && (
            <p className="mt-3 text-xs text-rose-600 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
              {error.message}
            </p>
          )}

          {data && (
            <div className="mt-4 pt-4 border-t border-border/60">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-border/70 bg-surface/50 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Last Traded Price
                  </span>
                  <span className="font-mono text-base sm:text-lg font-bold text-foreground">
                    {data.ltp != null ? `Rs. ${data.ltp.toFixed(2)}` : "–"}
                  </span>
                </div>
                <div className="rounded-xl border border-border/70 bg-surface/50 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Total Volume
                  </span>
                  <span className="font-mono text-base sm:text-lg font-bold text-foreground">
                    {data.total_volume.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="rounded-xl border border-border/70 bg-surface/50 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Cornering Index
                  </span>
                  <span className={`font-mono text-base sm:text-lg font-bold ${data.cornering_alert ? "text-rose-600" : "text-foreground"}`}>
                    {pct(data.cornering_index)}
                    {data.cornering_alert && <span className="text-[10px] block font-bold text-rose-600">⚠ Cornering Alert</span>}
                  </span>
                </div>
                <div className="rounded-xl border border-border/70 bg-surface/50 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Float Market Cap
                  </span>
                  <span className="font-mono text-base sm:text-lg font-bold text-foreground">
                    {data.float_market_cap ? `Rs. ${(data.float_market_cap / 1e7).toFixed(1)} Cr` : "–"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </ResponsiveCard>

        {data && (
          <>
            <ResponsiveCard>
              <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
                <div>
                  <h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                    Operator Cost-Basis Matrix
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Net buying volume, estimated VWAP, and unrealized profit/loss per brokerage firm
                  </p>
                </div>
              </div>
              <TableContainer scrollHint>
                <CostBasisMatrix rows={data.rows} />
              </TableContainer>
            </ResponsiveCard>

            <ResponsiveCard>
              <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
                <div>
                  <h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                    Broker-to-Broker Flow (Sankey)
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Institutional liquidity movement from net selling brokers to net accumulating brokers
                  </p>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl">
                <BrokerSankey links={data.sankey} />
              </div>
            </ResponsiveCard>
          </>
        )}
      </section>

      {/* Sidebar Live Feed & Scanners */}
      <aside className="space-y-6 min-w-0">
        <ResponsiveCard>
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-3">
            <h2 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
              <span>🐋</span>
              <span>Whale Block Trades</span>
            </h2>
            <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-full">
              Live Tape
            </span>
          </div>
          <WhaleTape symbol={symbol || undefined} live={liveWhales} />
        </ResponsiveCard>

        <ResponsiveCard>
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-3">
            <h2 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
              <span>🧠</span>
              <span>Smart Money Accumulation</span>
            </h2>
          </div>
          <AccumulationScanner onSelect={(s) => { setDraft(s); setSymbol(s); }} />
        </ResponsiveCard>
      </aside>
    </div>
  );
}
