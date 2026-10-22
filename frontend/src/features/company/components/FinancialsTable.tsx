import type { Quarter } from "../types";
import { crore, num } from "../format";

const ROWS: [keyof Quarter, string, (x: number | null) => string][] = [
  ["eps", "EPS", (x) => num(x)],
  ["bvps", "BVPS", (x) => num(x)],
  ["paid_up_capital", "Paid-up capital", crore],
  ["reserves", "Reserves", crore],
  ["net_profit", "Net profit", crore],
  ["distributable_profit", "Distributable profit", crore],
  ["total_assets", "Total assets", crore],
  ["total_debt", "Total debt", crore],
  ["cash", "Cash", crore],
];

export function FinancialsTable({ quarters }: { quarters: Quarter[] }) {
  if (quarters.length === 0) return <p className="text-sm text-gray-500">No quarterly financials yet.</p>;
  return (
    <section className="overflow-x-auto rounded border">
      <table className="min-w-full text-right text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">FY (BS)</th>
            {quarters.map((q) => (
              <th key={`${q.fy_bs}-${q.quarter}`} className="p-2 whitespace-nowrap" title={`Period end ${q.period_end}`}>
                {q.fy_bs} Q{q.quarter}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map(([key, label, fmt]) => (
            <tr key={key} className="border-t">
              <td className="p-2 text-left">{label}</td>
              {quarters.map((q) => (
                <td key={`${q.fy_bs}-${q.quarter}`} className="p-2 whitespace-nowrap">
                  {fmt(q[key] as number | null)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
