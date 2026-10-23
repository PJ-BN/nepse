"use client";

import { useEffect, useState } from "react";
import { useSimulation } from "../hooks/useSimulation";
import { type Combinator, newIndicator, newRow, parseHorizons, rowsToRules, type Row } from "../rules";
import type { SimulationRequest } from "../types";
import { ResultPanel } from "./ResultPanel";
import { RuleBuilder } from "./RuleBuilder";
import { SimulatorChart } from "./SimulatorChart";

const INPUT = "rounded border bg-transparent px-2 py-1";
const optNum = (s: string) => (s.trim() === "" || Number.isNaN(Number(s)) ? undefined : Number(s));

function errorMessage(e: Error) {
  if (e.message.startsWith("404")) return "No price history for that symbol.";
  if (e.message.startsWith("422")) return "The server rejected the rules or settings (422). Check indicator parameters, horizons and percentages.";
  return e.message;
}

export function SimulatorView({ initialSymbol }: { initialSymbol: string }) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [anchor, setAnchor] = useState("");
  const [horizons, setHorizons] = useState("5, 10, 20, 60");
  const [target, setTarget] = useState("");
  const [stop, setStop] = useState("");
  const [cost, setCost] = useState("");
  const [rows, setRows] = useState<Row[]>(() => [
    newRow(),
    newRow({ left: newIndicator("close"), op: ">", right: { ...newIndicator("sma"), params: { n: "200" } } }),
  ]);
  const [combinator, setCombinator] = useState<Combinator>("and");
  const [revealed, setRevealed] = useState(0);
  const sim = useSimulation();
  const result = sim.data;

  useEffect(() => setRevealed(0), [result]);

  const rules = rowsToRules(rows, combinator);
  const hs = parseHorizons(horizons);
  const problem = !symbol.trim() ? "Enter a symbol." : !anchor ? "Pick an anchor date." : !rules ? "Add a complete condition." : !hs ? "Horizons: positive whole numbers, comma separated." : null;

  const run = () => {
    if (problem || !rules || !hs) return;
    const req: SimulationRequest = {
      symbol: symbol.trim().toUpperCase(),
      anchor_date: anchor,
      rules,
      horizons: hs,
      target_pct: optNum(target),
      stop_pct: optNum(stop),
      cost_pct: optNum(cost),
    };
    sim.mutate(req);
  };

  const anchorIdx = result ? result.bars.findIndex((b) => b.t === result.anchor.date) : 0;
  const future = result ? result.bars.length - 1 - anchorIdx : 0;

  return (
    <div className="space-y-4">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1">Symbol
            <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="NABIL" className={`${INPUT} w-28 font-mono uppercase`} />
          </label>
          <label className="flex flex-col gap-1">Anchor date
            <input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} className={INPUT} />
          </label>
          <label className="flex flex-col gap-1">Horizons (bars)
            <input value={horizons} onChange={(e) => setHorizons(e.target.value)} className={`${INPUT} w-36`} />
          </label>
          <label className="flex flex-col gap-1">Target %
            <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" className={`${INPUT} w-20`} />
          </label>
          <label className="flex flex-col gap-1">Stop %
            <input value={stop} onChange={(e) => setStop(e.target.value)} inputMode="decimal" className={`${INPUT} w-20`} />
          </label>
          <label className="flex flex-col gap-1">Round-trip cost %
            <input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="decimal" placeholder="0" className={`${INPUT} w-20`} />
          </label>
        </div>
        <RuleBuilder rows={rows} combinator={combinator} onChange={(r, c) => { setRows(r); setCombinator(c); }} />
        <div className="flex items-center gap-3 text-sm">
          <button type="submit" disabled={!!problem || sim.isPending} className="rounded bg-foreground px-4 py-1.5 text-background disabled:opacity-50">
            {sim.isPending ? "Running…" : "Run simulation"}
          </button>
          {problem && <span className="text-gray-500">{problem}</span>}
        </div>
      </form>

      {sim.isError && <p role="alert" className="text-sm text-red-600">{errorMessage(sim.error)}</p>}

      {result && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium">Reveal the future</span>
            <input
              type="range"
              aria-label="Future bars revealed"
              min={0}
              max={future}
              value={Math.min(revealed, future)}
              onChange={(e) => setRevealed(Number(e.target.value))}
              className="w-56"
            />
            <span>{Math.min(revealed, future)} / {future} bars</span>
            {[1, 5, 10].map((n) => (
              <button key={n} type="button" onClick={() => setRevealed((r) => Math.min(future, r + n))} className="rounded border px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800">
                +{n}
              </button>
            ))}
            <button type="button" onClick={() => setRevealed(future)} className="rounded border px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800">All</button>
            <button type="button" onClick={() => setRevealed(0)} className="rounded border px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800">Reset</button>
          </div>
          <p className="text-xs text-gray-500">Blue arrows: earlier signal firings. Round marker: the anchor bar{result.anchor.date !== anchor ? ` (${result.anchor.date}, the last bar on or before ${anchor})` : ""}.</p>
          <SimulatorChart result={result} revealed={revealed} />
          <ResultPanel result={result} showForward={revealed > 0} />
        </div>
      )}
    </div>
  );
}
