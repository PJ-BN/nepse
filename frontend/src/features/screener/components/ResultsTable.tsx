"use client";

import { FIELDS, type FieldName } from "../fields";
import type { ScreenerRow } from "../types";

const LABELS: Record<string, string> = { trade_date: "Date", ...Object.fromEntries(Object.entries(FIELDS).map(([k, v]) => [k, v.label])) };
const INTEGER = new Set(["volume", "turnover", "market_cap"]);

function format(column: string, v: string | number | null) {
  if (v === null || v === undefined) return "—";
  if (typeof v !== "number") return v;
  return INTEGER.has(column) ? Math.round(v).toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

type Props = {
  columns: string[];
  rows: ScreenerRow[];
  sort: string | null; // "field" or "-field"
  onSort: (sort: string) => void;
};

export function ResultsTable({ columns, rows, sort, onSort }: Props) {
  if (rows.length === 0) return <p className="text-sm text-gray-500">No stocks match.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            {columns.map((c) => {
              const sortable = c in FIELDS;
              const dir = sort === c ? " ▲" : sort === `-${c}` ? " ▼" : "";
              return (
                <th key={c} className="whitespace-nowrap px-2 py-1 font-medium" aria-sort={dir ? (dir === " ▲" ? "ascending" : "descending") : undefined}>
                  {sortable ? (
                    <button type="button" className="hover:underline" onClick={() => onSort(sort === c ? `-${c}` : c)}>
                      {LABELS[c as FieldName] ?? c}
                      {dir}
                    </button>
                  ) : (
                    LABELS[c] ?? c
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.symbol} className="border-b hover:bg-gray-50">
              {columns.map((c) => (
                <td key={c} className={`whitespace-nowrap px-2 py-1 ${typeof r[c] === "number" ? "text-right tabular-nums" : ""}`}>
                  {format(c, r[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
