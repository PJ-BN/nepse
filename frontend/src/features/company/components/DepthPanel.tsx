import { num } from "../format";
import type { Depth, DepthLevel } from "../types";
import { TableContainer } from "@/shared/ui";

function Side({ title, rows, tone }: { title: string; rows: DepthLevel[]; tone: string }) {
  return (
    <div className="flex-1 min-w-[240px]">
      <TableContainer>
        <table className="min-w-full text-xs tabular-nums">
          <thead className="bg-muted/20 border-b border-border/60 text-[10px] uppercase font-bold text-muted-foreground">
            <tr>
              <th className="py-2 px-3 text-left">{title} Price</th>
              <th className="py-2 px-3 text-right">Quantity</th>
              <th className="py-2 px-3 text-right">Orders</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-mono">
            {rows.map((r) => (
              <tr key={r.price} className="hover:bg-muted/30 transition-colors">
                <td className={`py-1.5 px-3 text-left font-bold ${tone}`}>{num(r.price)}</td>
                <td className="py-1.5 px-3 text-right font-medium text-foreground">{num(r.qty, 0)}</td>
                <td className="py-1.5 px-3 text-right text-muted-foreground">{r.orders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableContainer>
    </div>
  );
}

export function DepthPanel({ depth }: { depth: Depth | null }) {
  if (!depth) return null;

  return (
    <section className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
        <h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground flex items-center gap-2">
          <span>📊</span>
          <span>Order Book & Market Depth</span>
        </h2>
        <div className="text-xs text-muted-foreground font-mono flex items-center gap-3">
          <span>Bid: <strong className="text-emerald-600 dark:text-emerald-400">{num(depth.total_buy_qty, 0)}</strong></span>
          <span>Ask: <strong className="text-rose-600 dark:text-rose-400">{num(depth.total_sell_qty, 0)}</strong></span>
        </div>
      </div>

      {depth.buy.length || depth.sell.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Side title="Bid (Buy)" rows={depth.buy} tone="text-emerald-600 dark:text-emerald-400" />
          <Side title="Ask (Sell)" rows={depth.sell} tone="text-rose-600 dark:text-rose-400" />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-2 text-center">No open order book depth recorded.</p>
      )}
    </section>
  );
}
