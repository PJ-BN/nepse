import { num } from "../format";
import type { Depth, DepthLevel } from "../types";

function Side({ title, rows, tone }: { title: string; rows: DepthLevel[]; tone: string }) {
  return (
    <table className="text-sm">
      <thead>
        <tr className="text-gray-500">
          <th className="pr-4 text-left">{title}</th>
          <th className="pr-4 text-right">Qty</th>
          <th className="text-right">Orders</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.price}>
            <td className={`pr-4 ${tone}`}>{num(r.price)}</td>
            <td className="pr-4 text-right">{num(r.qty, 0)}</td>
            <td className="text-right">{r.orders}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DepthPanel({ depth }: { depth: Depth | null }) {
  if (!depth) return null;
  return (
    <section className="rounded border p-3">
      <h2 className="pb-2 font-semibold">Market depth</h2>
      {depth.buy.length || depth.sell.length ? (
        <div className="flex flex-wrap gap-8">
          <Side title="Bid" rows={depth.buy} tone="text-green-600" />
          <Side title="Ask" rows={depth.sell} tone="text-red-600" />
        </div>
      ) : (
        <p className="text-sm text-gray-500">No open orders.</p>
      )}
      <p className="pt-2 text-xs text-gray-500">
        Total bid {num(depth.total_buy_qty, 0)} · total ask {num(depth.total_sell_qty, 0)}
      </p>
    </section>
  );
}
