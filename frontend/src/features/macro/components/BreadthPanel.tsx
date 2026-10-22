"use client";

import ReactECharts from "echarts-for-react";
import { useBreadth } from "../hooks/useMacro";

const pct = (v: number | null) => (v === null ? "—" : `${v.toFixed(0)}%`);

export function BreadthPanel() {
  const { data, error } = useBreadth();
  if (error) return <p className="text-sm text-gray-500">Breadth unavailable: {error.message}</p>;
  if (!data) return <p className="text-sm text-gray-500">Loading breadth…</p>;
  const option = {
    tooltip: { trigger: "axis" },
    grid: { left: 40, right: 40, top: 20, bottom: 30 },
    xAxis: { type: "category", data: data.series.map((s) => s.date) },
    yAxis: [{ type: "value", name: "Net A/D" }, { type: "value", name: "McClellan", position: "right" }],
    series: [
      { name: "Net advances", type: "bar", data: data.series.map((s) => s.net),
        itemStyle: { color: (p: { value: number }) => (p.value >= 0 ? "#16a34a" : "#dc2626") } },
      { name: "McClellan", type: "line", yAxisIndex: 1, showSymbol: false, data: data.series.map((s) => s.mcclellan) },
    ],
  };
  return (
    <div>
      <dl className="grid grid-cols-3 gap-2 text-center text-sm sm:grid-cols-6">
        <div><dt className="text-gray-500">Advances</dt><dd className="text-lg text-green-600">{data.advances}</dd></div>
        <div><dt className="text-gray-500">Declines</dt><dd className="text-lg text-red-600">{data.declines}</dd></div>
        <div><dt className="text-gray-500">Unchanged</dt><dd className="text-lg">{data.unchanged}</dd></div>
        <div><dt className="text-gray-500">&gt; SMA20</dt><dd className="text-lg">{pct(data.pct_above.sma_20)}</dd></div>
        <div><dt className="text-gray-500">&gt; SMA50</dt><dd className="text-lg">{pct(data.pct_above.sma_50)}</dd></div>
        <div><dt className="text-gray-500">&gt; SMA200</dt><dd className="text-lg">{pct(data.pct_above.sma_200)}</dd></div>
      </dl>
      <ReactECharts option={option} style={{ height: 220 }} notMerge />
      <p className="text-xs text-gray-500">As of {data.as_of}. McClellan = EMA19 − EMA39 of net advances.</p>
    </div>
  );
}
