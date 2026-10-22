"use client";

import { useRealized } from "../hooks/usePortfolio";
import { npr, signClass } from "./format";

export function RealizedPnl({ token }: { token: string }) {
  const { data, isLoading, error } = useRealized(token);
  if (isLoading) return <p>Loading…</p>;
  if (error) return <p className="text-red-600">{error.message}</p>;
  if (!data?.sells.length) return <p className="text-sm">No sells yet.</p>;
  return (
    <div className="overflow-x-auto">
      <p className="mb-2 text-sm">
        Total realised (net of fees and CGT):{" "}
        <span className={`font-semibold ${signClass(data.total_realized_pnl)}`}>
          NPR {npr(data.total_realized_pnl)}
        </span>
        {" · "}CGT paid: NPR {npr(data.total_cgt)}
      </p>
      <table className="w-full text-right text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left">Date</th>
            <th className="text-left">Symbol</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Fees</th>
            <th>CGT</th>
            <th>Cost (FIFO)</th>
            <th>Net received</th>
            <th>P/L</th>
          </tr>
        </thead>
        <tbody>
          {data.sells.map((s, i) => (
            <tr key={i} className="border-b">
              <td className="text-left">{s.sell_date}</td>
              <td className="text-left">{s.symbol}</td>
              <td>{s.qty.toLocaleString("en-IN")}</td>
              <td>{npr(s.rate)}</td>
              <td>{npr(s.total_fees)}</td>
              <td>{npr(s.cgt)}</td>
              <td>{npr(s.cost_basis)}</td>
              <td>{npr(s.net_receivable)}</td>
              <td className={signClass(s.realized_pnl)}>{npr(s.realized_pnl)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
