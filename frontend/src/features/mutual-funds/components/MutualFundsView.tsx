"use client";

import { useMutualFunds } from "../hooks/useMutualFunds";

const num = (v: number | null, d = 2) => (v === null ? "-" : v.toFixed(d));

export function MutualFundsView() {
  const { data, error, isLoading } = useMutualFunds();
  if (isLoading) return <p className="text-sm">Loading...</p>;
  if (error) return <p className="text-sm text-red-600">{error.message}</p>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Highlighted: trading more than 15% below NAV with maturity inside 12 months.
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-1">Symbol</th>
            <th>Name</th>
            <th className="text-right">LTP</th>
            <th className="text-right">NAV</th>
            <th className="text-right">Discount %</th>
            <th>Maturity</th>
            <th className="text-right">Days left</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((f) => (
            <tr key={f.symbol} className={f.flagged ? "bg-green-100 dark:bg-green-900/40" : "border-b"}>
              <td className="py-1 font-medium">{f.symbol}</td>
              <td>{f.name}</td>
              <td className="text-right">{num(f.ltp)}</td>
              <td className="text-right">{num(f.nav)}</td>
              <td className="text-right">{num(f.nav_discount_pct, 1)}</td>
              <td>{f.maturity_date ?? "-"}</td>
              <td className="text-right">{f.days_to_maturity ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
