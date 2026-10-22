"use client";

import Link from "next/link";
import { useState } from "react";
import type { CostBasisRow } from "../types";

type Key = keyof CostBasisRow;

const COLUMNS: [Key, string][] = [
  ["broker", "Broker"],
  ["buy_qty", "Buy qty"],
  ["sell_qty", "Sell qty"],
  ["net", "Net"],
  ["buy_vwap", "Buy VWAP"],
  ["sell_vwap", "Sell VWAP"],
  ["bar", "BAR %"],
  ["margin_pct", "Margin %"],
  ["unrealised_pl", "Unrealised P/L"],
];

const num = (v: number | null, digits = 0) =>
  v === null ? "–" : v.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits });

function cell(key: Key, v: number | null) {
  if (key === "bar" || key === "margin_pct") return v === null ? "–" : num(v * 100, 2);
  if (key === "buy_vwap" || key === "sell_vwap") return num(v, 2);
  return num(v);
}

const tone = (v: number | null) => (v === null || v === 0 ? "" : v > 0 ? "text-green-600" : "text-red-600");

export function CostBasisMatrix({ rows }: { rows: CostBasisRow[] }) {
  const [sort, setSort] = useState<{ key: Key; desc: boolean }>({ key: "net", desc: true });
  const sorted = [...rows].sort((a, b) => {
    // nulls always last
    const x = a[sort.key] ?? -Infinity;
    const y = b[sort.key] ?? -Infinity;
    return sort.desc ? y - x : x - y;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right text-sm tabular-nums">
        <thead>
          <tr className="border-b">
            {COLUMNS.map(([key, label]) => (
              <th key={key} className="px-2 py-1 font-medium">
                <button
                  onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : true }))}
                  aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : undefined}
                >
                  {label} {sort.key === key ? (sort.desc ? "▼" : "▲") : ""}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.broker} className="border-b border-gray-100">
              {COLUMNS.map(([key]) => (
                <td key={key} className={`px-2 py-1 ${["net", "bar", "margin_pct", "unrealised_pl"].includes(key) ? tone(r[key]) : ""}`}>
                  {key === "broker" ? (
                    <Link href={`/broker/${r.broker}`} className="underline">
                      #{r.broker}
                    </Link>
                  ) : (
                    cell(key, r[key])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
