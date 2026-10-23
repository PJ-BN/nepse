"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { fmtCrore, fmtPct } from "../format";
import type { Quote } from "../types";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

const CAP = 5; // % change at which the colour saturates

function color(pct: number) {
  const t = Math.min(Math.abs(pct) / CAP, 1);
  const [r, g, b] = pct >= 0 ? [22, 163, 74] : [220, 38, 38];
  const mix = (c: number) => Math.round(120 + (c - 120) * t); // from neutral grey towards red/green
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

/** Turnover or market-cap share per symbol (toggle), coloured by % change. */
export function TurnoverTreemap({ quotes, height = 480 }: { quotes: Quote[]; height?: number }) {
  const [by, setBy] = useState<"turnover" | "market_cap">("turnover");
  const size = (q: Quote) => (by === "turnover" ? q.turnover : (q.market_cap ?? 0));
  const data = quotes
    .filter((q) => size(q) > 0)
    .map((q) => ({ name: q.symbol, value: size(q), pct: q.pct_change, itemStyle: { color: color(q.pct_change) } }));

  const toggle = (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/15 text-primary text-xs shadow-2xs">
          🗺️
        </span>
        <div>
          <h2 className="text-sm font-bold tracking-tight text-foreground">Turnover & Liquidity Map</h2>
          <p className="text-[11px] text-muted-foreground">
            Visual treemap of equities sized by capital allocation, colored by daily return
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Color scale legend */}
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-red-600 inline-block" /> -5%
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-gray-500 inline-block" /> 0%
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600 inline-block" /> +5%
          </span>
        </div>

        {/* Segmented switch */}
        <div
          role="group"
          aria-label="Size by"
          className="inline-flex rounded-xl bg-muted/30 p-1 border border-border/60 text-xs font-medium"
        >
          {(["turnover", "market_cap"] as const).map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => setBy(k)}
              aria-pressed={by === k}
              className={`rounded-lg px-3 py-1 transition-all text-xs font-semibold ${
                by === k
                  ? "bg-foreground text-background shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {k === "turnover" ? "Turnover" : "Market cap"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (data.length === 0)
    return (
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
        {toggle}
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          {by === "turnover" ? "No turnover data available yet." : "No market-cap data available."}
        </div>
      </div>
    );

  // echarts also formats the (data-less) root node, hence the optional pct.
  const pctOf = (p: { data?: { pct?: number } }) => (p.data?.pct == null ? "" : fmtPct(p.data.pct));
  const option = {
    tooltip: {
      backgroundColor: "rgba(18, 22, 34, 0.95)",
      borderColor: "rgba(255, 255, 255, 0.12)",
      textStyle: { color: "#ffffff", fontSize: 12 },
      formatter: (p: { name: string; value: number; data?: { pct?: number } }) =>
        `<div style="font-weight: bold; margin-bottom: 2px;">${p.name}</div>
         <div style="font-family: monospace;">${fmtCrore(p.value)}</div>
         <div style="font-family: monospace; font-weight: bold;">${pctOf(p)}</div>`,
    },
    series: [
      {
        type: "treemap",
        data,
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        width: "100%",
        height: "100%",
        label: {
          formatter: (p: { name: string; data?: { pct?: number } }) => `${p.name}\n${pctOf(p)}`,
          fontSize: 11,
          fontWeight: "bold",
          color: "#ffffff",
        },
        itemStyle: {
          borderColor: "rgba(20, 24, 38, 0.8)",
          borderWidth: 1.5,
          gapWidth: 1.5,
        },
      },
    ],
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
      {toggle}
      <div className="overflow-hidden rounded-xl">
        <ReactECharts option={option} style={{ height }} notMerge />
      </div>
    </div>
  );
}
