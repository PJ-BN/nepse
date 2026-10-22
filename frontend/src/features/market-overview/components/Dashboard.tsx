"use client";

import { useLiveFeed } from "@/features/live-feed";
import { useMarketSummary } from "../hooks/useMarketSummary";
import { fmtCrore } from "../format";
import { IndexStrip } from "./IndexStrip";
import { MoversTable } from "./MoversTable";
import { TurnoverTreemap } from "./TurnoverTreemap";

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-green-600 text-white",
  PRE_OPEN: "bg-amber-500 text-white",
  HALTED: "bg-red-600 text-white",
  CLOSED: "bg-gray-500 text-white",
};

export function Dashboard() {
  useLiveFeed();
  const { summary, isPending, isError, error } = useMarketSummary();

  if (isPending) return <p className="text-sm text-gray-500">Loading market…</p>;
  if (isError || !summary) return <p className="text-sm text-red-600">Market summary unavailable: {String(error)}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[summary.status] ?? ""}`}>
          {summary.status.replace("_", " ")}
        </span>
        <span>Turnover {fmtCrore(summary.turnover)}</span>
        <span className="text-green-600">▲ {summary.advances}</span>
        <span className="text-red-600">▼ {summary.declines}</span>
        <span className="text-gray-500">● {summary.unchanged}</span>
        <span className="text-xs text-gray-500">
          {summary.source === "live" ? "Live" : summary.source === "eod" ? "End of day" : "No data yet"}
          {summary.as_of && ` · ${new Date(summary.as_of).toLocaleString()}`}
        </span>
      </div>
      <IndexStrip index={summary.index} subIndices={summary.sub_indices} />
      <div className="grid gap-4 md:grid-cols-3">
        <MoversTable title="Top gainers" rows={summary.gainers} />
        <MoversTable title="Top losers" rows={summary.losers} />
        <MoversTable title="Top turnover" rows={summary.top_turnover} showTurnover />
      </div>
      <section className="rounded border p-2">
        <h2 className="px-1 pb-2 text-sm font-semibold">Turnover map</h2>
        <TurnoverTreemap quotes={summary.quotes} />
      </section>
    </div>
  );
}
