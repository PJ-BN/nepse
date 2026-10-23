"use client";

import type { Chart } from "klinecharts";
import { useEffect, useState } from "react";
import { SPEEDS, stepIndex } from "../replay";
import type { Candle } from "../types";

const btn = "rounded border px-2 py-0.5 hover:bg-hover disabled:opacity-40";

/** Bar replay: pick a start bar on the chart, then play/pause/step through the candles after it. `idx` null = off. */
export function ReplayBar({
  chart,
  full,
  idx,
  onIdx,
}: {
  chart: Chart | null;
  full: Candle[];
  idx: number | null;
  onIdx: (i: number | null) => void;
}) {
  const [picking, setPicking] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(SPEEDS[1]);
  const total = full.length;

  useEffect(() => {
    if (!picking || !chart) return;
    const click = (d?: unknown) => {
      const t = (d as { data?: { current?: { timestamp?: number } } } | undefined)?.data?.current?.timestamp;
      const i = full.findIndex((c) => c.time * 1000 === t);
      if (i < 0) return;
      setPicking(false);
      onIdx(i);
    };
    chart.subscribeAction("onCandleBarClick", click);
    return () => chart.unsubscribeAction("onCandleBarClick", click);
  }, [picking, chart, full, onIdx]);

  useEffect(() => {
    if (!playing) return;
    if (idx === null || idx >= total - 1) return setPlaying(false);
    const t = setTimeout(() => onIdx(stepIndex(idx, total)), 1000 / speed);
    return () => clearTimeout(t);
  }, [playing, idx, speed, total, onIdx]);

  const exit = () => {
    setPlaying(false);
    setPicking(false);
    onIdx(null);
  };

  if (idx === null && !picking) {
    return (
      <button type="button" className={btn} disabled={total < 2} onClick={() => setPicking(true)}>
        ⏪ Replay
      </button>
    );
  }
  if (idx === null) {
    return (
      <span className="flex items-center gap-2 text-xs">
        Click a bar to start the replay from
        <button type="button" className={btn} onClick={exit}>Cancel</button>
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-1 text-xs" role="group" aria-label="Replay">
      <button type="button" className={btn} onClick={() => onIdx(stepIndex(idx, total, -1))} disabled={idx <= 0} aria-label="Step back">⏮</button>
      <button type="button" className={btn} onClick={() => setPlaying(!playing)} disabled={idx >= total - 1}>
        {playing ? "⏸ Pause" : "▶ Play"}
      </button>
      <button type="button" className={btn} onClick={() => onIdx(stepIndex(idx, total))} disabled={idx >= total - 1} aria-label="Step forward">⏭</button>
      <select aria-label="Replay speed" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="rounded border bg-background px-1 py-0.5">
        {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
      </select>
      <span className="text-gray-500">{idx + 1}/{total}</span>
      <button type="button" className={btn} onClick={exit}>Exit replay</button>
    </span>
  );
}
