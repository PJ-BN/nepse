"use client";

import { useRealized } from "../hooks/usePortfolio";
import { npr, signClass } from "./format";
import { TableContainer } from "@/shared/ui";

export function RealizedPnl({ token }: { token: string }) {
  const { data, isLoading, error } = useRealized(token);
  if (isLoading) return <p className="text-xs text-muted-foreground animate-pulse py-4">Loading realized tax records…</p>;
  if (error) return <p className="text-xs text-rose-600 bg-rose-500/10 p-3 rounded-xl">{error.message}</p>;
  if (!data?.sells.length) return <p className="text-xs text-muted-foreground py-4 text-center">No realized exit transactions recorded yet.</p>;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/80 bg-muted/20 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Total Realised Net of Fees & CGT: </span>
          <span className={`font-mono font-bold text-sm ${signClass(data.total_realized_pnl)}`}>
            NPR {npr(data.total_realized_pnl)}
          </span>
        </div>
        <div className="font-mono text-muted-foreground">
          CGT Paid: <strong className="text-foreground">NPR {npr(data.total_cgt)}</strong>
        </div>
      </div>

      <TableContainer scrollHint>
        <table className="min-w-full text-right text-xs tabular-nums font-mono">
          <thead className="bg-muted/20 border-b border-border/60 text-[10px] uppercase font-bold text-muted-foreground">
            <tr>
              <th className="py-2.5 px-3 text-left font-sans">Date</th>
              <th className="py-2.5 px-3 text-left">Symbol</th>
              <th className="py-2.5 px-3">Qty</th>
              <th className="py-2.5 px-3">Rate</th>
              <th className="py-2.5 px-3">Fees</th>
              <th className="py-2.5 px-3">CGT</th>
              <th className="py-2.5 px-3">Cost (FIFO)</th>
              <th className="py-2.5 px-3">Net Received</th>
              <th className="py-2.5 px-4">P/L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {data.sells.map((s, i) => (
              <tr key={i} className="hover:bg-muted/30 transition-colors">
                <td className="py-2.5 px-3 text-left font-sans text-muted-foreground">{s.sell_date}</td>
                <td className="py-2.5 px-3 text-left font-bold text-foreground">{s.symbol}</td>
                <td className="py-2.5 px-3">{s.qty.toLocaleString("en-IN")}</td>
                <td className="py-2.5 px-3">Rs. {npr(s.rate)}</td>
                <td className="py-2.5 px-3 text-muted-foreground">Rs. {npr(s.total_fees)}</td>
                <td className="py-2.5 px-3 text-muted-foreground">Rs. {npr(s.cgt)}</td>
                <td className="py-2.5 px-3 text-muted-foreground">Rs. {npr(s.cost_basis)}</td>
                <td className="py-2.5 px-3 font-semibold text-foreground">Rs. {npr(s.net_receivable)}</td>
                <td className={`py-2.5 px-4 font-bold ${signClass(s.realized_pnl)}`}>
                  {Number(s.realized_pnl) >= 0 ? "+" : ""}Rs. {npr(s.realized_pnl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableContainer>
    </div>
  );
}
