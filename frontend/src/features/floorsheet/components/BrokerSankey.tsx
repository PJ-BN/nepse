"use client";

import ReactECharts from "echarts-for-react";
import type { SankeyLink } from "../types";

// Shares move seller -> buyer. Sides get distinct node names so a broker on both sides can't form a cycle.
export function BrokerSankey({ links }: { links: SankeyLink[] }) {
  if (links.length === 0) return <p className="text-sm text-gray-500">No broker-to-broker flow in this window.</p>;
  const sellers = [...new Set(links.map((l) => `S #${l.seller}`))];
  const buyers = [...new Set(links.map((l) => `B #${l.buyer}`))];
  const option = {
    tooltip: { trigger: "item" },
    series: [
      {
        type: "sankey",
        emphasis: { focus: "adjacency" },
        data: [...sellers, ...buyers].map((name) => ({ name })),
        links: links.map((l) => ({ source: `S #${l.seller}`, target: `B #${l.buyer}`, value: l.qty })),
        lineStyle: { color: "gradient", curveness: 0.5 },
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 420 }} notMerge />;
}
