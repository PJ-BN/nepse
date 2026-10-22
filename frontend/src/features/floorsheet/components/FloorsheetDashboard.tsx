"use client";

import { useState } from "react";
import { useWhaleTrades } from "@/features/live-feed";
import { useBrokerAnalytics } from "../hooks/useFloorsheet";
import { WINDOWS } from "../types";
import { AccumulationScanner } from "./AccumulationScanner";
import { BrokerSankey } from "./BrokerSankey";
import { CostBasisMatrix } from "./CostBasisMatrix";
import { WhaleTape } from "./WhaleTape";

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export function FloorsheetDashboard({ initialSymbol = "" }: { initialSymbol?: string }) {
  const [draft, setDraft] = useState(initialSymbol);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [days, setDays] = useState<number>(30);
  const { data, error, isFetching } = useBrokerAnalytics(symbol, days);
  const liveWhales = useWhaleTrades();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
      <section className="space-y-4">
        <form
          className="flex flex-wrap items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setSymbol(draft.trim().toUpperCase());
          }}
        >
          <label className="flex items-center gap-2">
            Symbol
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. NABIL"
              className="w-32 rounded border px-2 py-1 uppercase"
            />
          </label>
          <button className="rounded border px-3 py-1">Load</button>
          <div role="group" aria-label="Window (trading days)" className="flex gap-1">
            {WINDOWS.map((w) => (
              <button
                type="button"
                key={w}
                onClick={() => setDays(w)}
                aria-pressed={days === w}
                className={`rounded border px-2 py-1 ${days === w ? "bg-gray-900 text-white" : ""}`}
              >
                {w}D
              </button>
            ))}
          </div>
          {isFetching && <span className="text-sm text-gray-500">Loading…</span>}
        </form>

        {error && <p className="text-red-600">{error.message}</p>}
        {data && (
          <>
            <dl className="flex flex-wrap gap-6 text-sm">
              <div><dt className="text-gray-500">LTP</dt><dd>{data.ltp?.toFixed(2) ?? "–"}</dd></div>
              <div><dt className="text-gray-500">Volume</dt><dd>{data.total_volume.toLocaleString("en-IN")}</dd></div>
              <div>
                <dt className="text-gray-500">Cornering index</dt>
                <dd className={data.cornering_alert ? "font-semibold text-red-600" : ""}>
                  {pct(data.cornering_index)} {data.cornering_alert && "⚠ cornering alert"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Float market cap</dt>
                <dd>{data.float_market_cap ? `Rs ${(data.float_market_cap / 1e7).toFixed(1)} Cr` : "–"}</dd>
              </div>
            </dl>
            <h2 className="text-lg font-semibold">Operator cost-basis matrix</h2>
            <CostBasisMatrix rows={data.rows} />
            <h2 className="text-lg font-semibold">Broker-to-broker flow</h2>
            <BrokerSankey links={data.sankey} />
          </>
        )}
      </section>

      <aside className="space-y-6">
        <div>
          <h2 className="mb-2 text-lg font-semibold">Whale trades</h2>
          <WhaleTape symbol={symbol || undefined} live={liveWhales} />
        </div>
        <div>
          <h2 className="mb-2 text-lg font-semibold">Smart money accumulation</h2>
          <AccumulationScanner onSelect={(s) => { setDraft(s); setSymbol(s); }} />
        </div>
      </aside>
    </div>
  );
}
