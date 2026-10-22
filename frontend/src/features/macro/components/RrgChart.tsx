"use client";

import ReactECharts from "echarts-for-react";
import { useEffect, useState } from "react";
import { useRrg } from "../hooks/useMacro";
import type { Rrg } from "../types";

const QUADRANTS = [
  // x/y ranges around the 100/100 centre; infinite edges are clamped to the visible axis range
  { name: "Leading", x: [100, Infinity], y: [100, Infinity], color: "rgba(22,163,74,0.08)" },
  { name: "Weakening", x: [100, Infinity], y: [-Infinity, 100], color: "rgba(202,138,4,0.08)" },
  { name: "Lagging", x: [-Infinity, 100], y: [-Infinity, 100], color: "rgba(220,38,38,0.08)" },
  { name: "Improving", x: [-Infinity, 100], y: [100, Infinity], color: "rgba(37,99,235,0.08)" },
];
const TAIL = 8;
const STEP_MS = 700;

function bounds(rrg: Rrg) {
  const pts = rrg.sectors.flatMap((s) => s.tail);
  const span = (vals: number[]) => Math.max(1.5, ...vals.map((v) => Math.abs(v - 100))) * 1.15;
  return { dx: span(pts.map((p) => p.rs_ratio)), dy: span(pts.map((p) => p.rs_momentum)) };
}

/** JdK RRG: each sector's tail of RS-Ratio (x) vs RS-Momentum (y); "Play" replays the tails point by point. */
export function RrgChart() {
  const [timeframe, setTimeframe] = useState<Rrg["timeframe"]>("daily");
  const [step, setStep] = useState(TAIL);
  const [playing, setPlaying] = useState(false);
  const { data, error } = useRrg(timeframe, TAIL);
  const longest = Math.max(1, ...(data?.sectors ?? []).map((s) => s.tail.length));

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setStep((s) => {
        if (s >= longest) {
          setPlaying(false);
          return longest;
        }
        return s + 1;
      });
    }, STEP_MS);
    return () => clearInterval(id);
  }, [playing, longest]);

  if (error) return <p className="text-sm text-red-600">RRG unavailable: {error.message}</p>;
  if (!data) return <p className="text-sm text-gray-500">Loading RRG…</p>;
  if (data.sectors.length === 0) return <p className="text-sm text-gray-500">Not enough sector index history yet.</p>;

  const { dx, dy } = bounds(data);
  const clampX = (v: number) => Math.max(100 - dx, Math.min(100 + dx, v));
  const clampY = (v: number) => Math.max(100 - dy, Math.min(100 + dy, v));
  const option = {
    animationDurationUpdate: STEP_MS - 100,
    tooltip: {
      trigger: "item",
      formatter: (p: { seriesName: string; value: [number, number, string] }) =>
        `${p.seriesName}<br/>${p.value[2]}<br/>RS-Ratio ${p.value[0].toFixed(2)}<br/>RS-Momentum ${p.value[1].toFixed(2)}`,
    },
    grid: { left: 50, right: 20, top: 20, bottom: 40 },
    xAxis: { type: "value", name: "RS-Ratio", nameLocation: "middle", nameGap: 25, min: 100 - dx, max: 100 + dx,
             axisLabel: { formatter: (v: number) => v.toFixed(1) }, splitLine: { show: false } },
    yAxis: { type: "value", name: "RS-Momentum", min: 100 - dy, max: 100 + dy,
             axisLabel: { formatter: (v: number) => v.toFixed(1) }, splitLine: { show: false } },
    series: [
      {
        type: "scatter",
        name: "quadrants",
        data: [],
        silent: true,
        markArea: {
          silent: true,
          label: { position: "insideTopLeft", color: "#6b7280" },
          data: QUADRANTS.map((q) => [
            { name: q.name, xAxis: clampX(q.x[0]), yAxis: clampY(q.y[0]), itemStyle: { color: q.color } },
            { xAxis: clampX(q.x[1]), yAxis: clampY(q.y[1]) },
          ]),
        },
        markLine: { silent: true, symbol: "none", label: { show: false }, lineStyle: { color: "#9ca3af" }, data: [{ xAxis: 100 }, { yAxis: 100 }] },
      },
      ...data.sectors.map((s) => {
        const shown = s.tail.slice(0, Math.max(1, step - (longest - s.tail.length)));
        return {
          type: "line",
          name: s.name,
          data: shown.map((p) => [p.rs_ratio, p.rs_momentum, p.date]),
          symbolSize: (_: unknown, params: { dataIndex: number }) => (params.dataIndex === shown.length - 1 ? 11 : 4),
          label: { show: true, formatter: (p: { dataIndex: number }) => (p.dataIndex === shown.length - 1 ? s.code : ""),
                   position: "right", fontSize: 10 },
          lineStyle: { width: 1.5, opacity: 0.8 },
        };
      }),
    ],
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-3 text-sm">
        <select aria-label="Timeframe" className="rounded border px-2 py-1" value={timeframe}
                onChange={(e) => { setTimeframe(e.target.value as Rrg["timeframe"]); setStep(TAIL); }}>
          <option value="daily">Daily (10-day)</option>
          <option value="weekly">Weekly (10-week)</option>
        </select>
        <button type="button" className="rounded border px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => { setStep(1); setPlaying(true); }}>
          {playing ? "Playing…" : "▶ Play tails"}
        </button>
        <span className="text-gray-500">vs {data.benchmark}</span>
      </div>
      <ReactECharts option={option} style={{ height: 460 }} />
      <ul className="mt-2 grid grid-cols-2 gap-1 text-xs sm:grid-cols-4">
        {data.sectors.map((s) => (
          <li key={s.code}><span className="font-medium">{s.code}</span> · {s.quadrant}</li>
        ))}
      </ul>
    </div>
  );
}
