import Link from "next/link";
import { fmt, fmtCrore, fmtPct, tone } from "../format";
import type { Quote } from "../types";

export function MoversTable({ title, rows, showTurnover = false }: { title: string; rows: Quote[]; showTurnover?: boolean }) {
  return (
    <section className="rounded border">
      <h2 className="border-b px-3 py-2 text-sm font-semibold">{title}</h2>
      <table className="w-full text-sm">
        <thead className="text-xs text-gray-500">
          <tr>
            <th className="px-3 py-1 text-left font-normal">Symbol</th>
            <th className="px-3 py-1 text-right font-normal">LTP</th>
            <th className="px-3 py-1 text-right font-normal">{showTurnover ? "Turnover" : "Change"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((q) => (
            <tr key={q.symbol} className="border-t">
              <td className="px-3 py-1">
                <Link href={`/chart?symbol=${encodeURIComponent(q.symbol)}`} className="font-mono hover:underline">
                  {q.symbol}
                </Link>
              </td>
              <td className="px-3 py-1 text-right font-mono">{fmt(q.ltp)}</td>
              <td className={`px-3 py-1 text-right font-mono ${showTurnover ? "" : tone(q.pct_change)}`}>
                {showTurnover ? fmtCrore(q.turnover) : fmtPct(q.pct_change)}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="px-3 py-2 text-center text-gray-500">No data</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
