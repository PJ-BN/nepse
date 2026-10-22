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
export function TurnoverTreemap({ quotes, height = 420 }: { quotes: Quote[]; height?: number }) {
  const [by, setBy] = useState<"turnover" | "market_cap">("turnover");
  const size = (q: Quote) => (by === "turnover" ? q.turnover : (q.market_cap ?? 0));
  const data = quotes
    .filter((q) => size(q) > 0)
    .map((q) => ({ name: q.symbol, value: size(q), pct: q.pct_change, itemStyle: { color: color(q.pct_change) } }));
  const toggle = (
    <div role="group" aria-label="Size by" className="mb-2 flex gap-1 text-sm">
      {(["turnover", "market_cap"] as const).map((k) => (
        <button
          type="button"
          key={k}
          onClick={() => setBy(k)}
          aria-pressed={by === k}
          className={`rounded border px-2 py-0.5 ${by === k ? "bg-gray-900 text-white" : ""}`}
        >
          {k === "turnover" ? "Turnover" : "Market cap"}
        </button>
      ))}
    </div>
  );
  if (data.length === 0)
    return (
      <>
        {toggle}
        <p className="text-sm text-gray-500">{by === "turnover" ? "No turnover yet." : "No market-cap data."}</p>
      </>
    );
  // echarts also formats the (data-less) root node, hence the optional pct.
  const pctOf = (p: { data?: { pct?: number } }) => (p.data?.pct == null ? "" : fmtPct(p.data.pct));
  const option = {
    tooltip: {
      formatter: (p: { name: string; value: number; data?: { pct?: number } }) =>
        `${p.name}<br/>${fmtCrore(p.value)}<br/>${pctOf(p)}`,
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
        label: { formatter: (p: { name: string; data?: { pct?: number } }) => `${p.name}\n${pctOf(p)}`, fontSize: 11 },
        itemStyle: { borderColor: "#fff", borderWidth: 1, gapWidth: 1 },
      },
    ],
  };
  return (
    <>
      {toggle}
      <ReactECharts option={option} style={{ height }} notMerge />
    </>
  );
}
