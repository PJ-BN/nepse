"use client";

import { useState } from "react";
import { useBookClosures, useDividends, useRights } from "../hooks/useCalendar";
import type { DividendEvent } from "../types";

const TABS = ["Upcoming book closures", "Dividend history", "Right shares"] as const;

function Table({ rows, cols }: { rows: DividendEvent[]; cols: ("div" | "right")[] }) {
  if (rows.length === 0) return <p className="text-sm text-gray-500">Nothing listed.</p>;
  return (
    <div className="max-h-[32rem] overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-white dark:bg-black">
          <tr className="border-b text-left">
            <th className="px-2 py-1">Symbol</th>
            <th className="px-2 py-1">Company</th>
            <th className="px-2 py-1">FY (BS)</th>
            {cols.includes("div") && <th className="px-2 py-1 text-right">Bonus %</th>}
            {cols.includes("div") && <th className="px-2 py-1 text-right">Cash %</th>}
            {cols.includes("right") && <th className="px-2 py-1">Right ratio</th>}
            <th className="px-2 py-1">Book closure</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.symbol}-${r.fy_bs}-${r.book_closure_date}`} className="border-b">
              <td className="px-2 py-1 font-medium">{r.symbol}</td>
              <td className="px-2 py-1">{r.name}</td>
              <td className="px-2 py-1 tabular-nums">{r.fy_bs}</td>
              {cols.includes("div") && <td className="px-2 py-1 text-right tabular-nums">{r.bonus_pct}</td>}
              {cols.includes("div") && <td className="px-2 py-1 text-right tabular-nums">{r.cash_pct}</td>}
              {cols.includes("right") && <td className="px-2 py-1">{r.right_ratio ?? "—"}</td>}
              <td className="px-2 py-1 tabular-nums">{r.book_closure_date ?? "TBA"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DividendsBoard() {
  const [tab, setTab] = useState(0);
  const [symbol, setSymbol] = useState("");
  const sym = symbol.trim().toUpperCase() || undefined;
  const closures = useBookClosures(90);
  const dividends = useDividends(sym);
  const rights = useRights(sym);
  const active = [closures, dividends, rights][tab];
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        {TABS.map((t, i) => (
          <button key={t} type="button" onClick={() => setTab(i)}
                  className={`rounded border px-3 py-1 ${i === tab ? "border-blue-600 text-blue-700 dark:text-blue-300" : ""}`}>
            {t}
          </button>
        ))}
        {tab > 0 && (
          <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="Symbol"
                 className="rounded border bg-transparent px-2 py-1" />
        )}
      </div>
      {active.error ? (
        <p className="text-sm text-red-600">Unavailable: {active.error.message}</p>
      ) : (
        <Table rows={active.data ?? []} cols={tab === 0 ? ["div", "right"] : tab === 1 ? ["div"] : ["right"]} />
      )}
    </div>
  );
}
