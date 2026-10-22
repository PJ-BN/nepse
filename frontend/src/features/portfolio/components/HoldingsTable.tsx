"use client";

import { useHoldings } from "../hooks/usePortfolio";
import { npr, signClass } from "./format";

export function HoldingsTable({ token }: { token: string }) {
  const { data, isLoading, error } = useHoldings(token);
  if (isLoading) return <p>Loading holdings…</p>;
  if (error) return <p className="text-red-600">{error.message}</p>;
  if (!data?.length) return <p className="text-sm">No holdings yet. Add a transaction below.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left">Symbol</th>
            <th>Qty</th>
            <th>WACC</th>
            <th>LTP</th>
            <th>Value</th>
            <th>Unrealised P/L</th>
            <th>Day change</th>
          </tr>
        </thead>
        <tbody>
          {data.map((h) => (
            <tr key={h.symbol} className="border-b">
              <td className="text-left font-medium">{h.symbol}</td>
              <td>{h.qty.toLocaleString("en-IN")}</td>
              <td>{npr(h.wacc)}</td>
              <td>{npr(h.ltp)}</td>
              <td>{npr(h.market_value)}</td>
              <td className={signClass(h.unrealized_pnl)}>{npr(h.unrealized_pnl)}</td>
              <td className={signClass(h.day_change)}>{npr(h.day_change)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
