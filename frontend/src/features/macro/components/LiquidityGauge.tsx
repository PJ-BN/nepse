"use client";

import ReactECharts from "echarts-for-react";
import type { Regime } from "../types";

const REGIME_COLOR = { BULLISH: "#16a34a", NEUTRAL: "#ca8a04", BEARISH: "#dc2626" } as const;

const pct = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`);

export function LiquidityGauge({ regime }: { regime: Regime | null }) {
  if (!regime) return <p className="text-sm text-gray-500">No CD ratio / interbank data yet.</p>;
  const option = {
    series: [
      {
        type: "gauge",
        min: 0,
        max: 100,
        startAngle: 200,
        endAngle: -20,
        axisLine: { lineStyle: { width: 14, color: [[0.35, "#dc2626"], [0.65, "#ca8a04"], [1, "#16a34a"]] } },
        pointer: { width: 5 },
        axisTick: { show: false },
        splitLine: { length: 10 },
        axisLabel: { distance: 18, fontSize: 10 },
        detail: { valueAnimation: true, formatter: "{value}", fontSize: 26, offsetCenter: [0, "30%"] },
        title: { offsetCenter: [0, "62%"], fontSize: 12 },
        data: [{ value: regime.score, name: "Liquidity score" }],
      },
    ],
  };
  return (
    <div>
      <ReactECharts option={option} style={{ height: 220 }} />
      <p className="text-center text-sm">
        Regime: <strong style={{ color: REGIME_COLOR[regime.regime] }}>{regime.regime}</strong>
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 text-sm">
        <dt className="text-gray-500">CD ratio</dt>
        <dd className="text-right tabular-nums">{regime.cd_ratio.toFixed(2)}% ({pct(regime.cd_roc_30d)} 30d)</dd>
        <dt className="text-gray-500">Interbank</dt>
        <dd className="text-right tabular-nums">{regime.interbank_rate.toFixed(2)}% ({pct(regime.interbank_roc_30d)} 30d)</dd>
      </dl>
      <p className="mt-2 text-xs text-gray-500">
        50 = unchanged; falling CD ratio and interbank rate push it up. Bullish when CD ratio &lt; 82% and interbank &lt; 3.5%.
      </p>
    </div>
  );
}
