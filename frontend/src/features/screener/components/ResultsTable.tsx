"use client";

import Link from "next/link";
import { FIELDS, type FieldName } from "../fields";
import type { ScreenerRow } from "../types";
import { TableContainer } from "@/shared/ui";

const LABELS: Record<string, string> = {
  trade_date: "Date",
  ...Object.fromEntries(Object.entries(FIELDS).map(([k, v]) => [k, v.label])),
};
const INTEGER = new Set(["volume", "turnover", "market_cap"]);

function format(column: string, v: string | number | null) {
  if (v === null || v === undefined) return "—";
  if (typeof v !== "number") return v;
  return INTEGER.has(column)
    ? Math.round(v).toLocaleString()
    : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

type Props = {
  columns: string[];
  rows: ScreenerRow[];
  sort: string | null;
  onSort: (sort: string) => void;
};

export function ResultsTable({ columns, rows, sort, onSort }: Props) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground py-8 text-center">No equities match the specified filters.</p>;
  }

  return (
    <TableContainer maxHeight="36rem" scrollHint>
      <table className="min-w-full text-xs text-left">
        <thead className="sticky top-0 z-10 bg-card border-b border-border/80 text-[10px] uppercase font-bold text-muted-foreground shadow-2xs">
          <tr>
            {columns.map((c) => {
              const sortable = c in FIELDS;
              const dir = sort === c ? " ▲" : sort === `-${c}` ? " ▼" : "";
              return (
                <th
                  key={c}
                  className="whitespace-nowrap py-2.5 px-3 font-semibold"
                  aria-sort={dir ? (dir === " ▲" ? "ascending" : "descending") : undefined}
                >
                  {sortable ? (
                    <button
                      type="button"
                      className="hover:underline flex items-center gap-1 font-bold cursor-pointer"
                      onClick={() => onSort(sort === c ? `-${c}` : c)}
                    >
                      <span>{LABELS[c as FieldName] ?? c}</span>
                      <span className="text-primary font-mono">{dir}</span>
                    </button>
                  ) : (
                    LABELS[c] ?? c
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40 font-mono">
          {rows.map((r) => (
            <tr key={r.symbol} className="hover:bg-muted/30 transition-colors">
              {columns.map((c) => {
                const val = r[c];
                const isSym = c === "symbol";
                return (
                  <td
                    key={c}
                    className={`whitespace-nowrap py-2 px-3 ${
                      typeof val === "number" ? "text-right tabular-nums text-foreground font-medium" : ""
                    }`}
                  >
                    {isSym ? (
                      <Link
                        href={`/chart?symbol=${encodeURIComponent(String(val))}`}
                        className="font-bold text-primary hover:underline"
                      >
                        {String(val)}
                      </Link>
                    ) : (
                      format(c, val)
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </TableContainer>
  );
}
