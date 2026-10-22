"use client";

import ReactECharts from "echarts-for-react";
import type { MacroRadar, Point } from "../types";

const pairs = (points: Point[] | undefined) => (points ?? []).map((p) => [p.date, p.value]);

/** NEPSE (left axis) against the interbank rate (inverted right axis, so easing money plots upward) and CD ratio. */
export function MacroDualAxis({ radar }: { radar: MacroRadar }) {
  if (radar.nepse.length === 0 && !radar.series.interbank_rate?.length) {
    return <p className="text-sm text-gray-500">No NEPSE index or NRB history yet.</p>;
  }
  const option = {
    tooltip: { trigger: "axis" },
    legend: { data: ["NEPSE", "Interbank rate (inverted)", "CD ratio"] },
    grid: { left: 60, right: 110, top: 40, bottom: 60 },
    xAxis: { type: "time" },
    yAxis: [
      { type: "value", name: "NEPSE", scale: true },
      { type: "value", name: "Interbank %", inverse: true, scale: true, position: "right", splitLine: { show: false } },
      { type: "value", name: "CD %", scale: true, position: "right", offset: 55, splitLine: { show: false } },
    ],
    dataZoom: [{ type: "inside" }, { type: "slider" }],
    series: [
      { name: "NEPSE", type: "line", showSymbol: false, data: pairs(radar.nepse), yAxisIndex: 0 },
      { name: "Interbank rate (inverted)", type: "line", step: "end", showSymbol: false, yAxisIndex: 1,
        data: pairs(radar.series.interbank_rate) },
      { name: "CD ratio", type: "line", showSymbol: false, yAxisIndex: 2, lineStyle: { type: "dashed" },
        data: pairs(radar.series.cd_ratio) },
    ],
  };
  return <ReactECharts option={option} style={{ height: 380 }} notMerge />;
}
