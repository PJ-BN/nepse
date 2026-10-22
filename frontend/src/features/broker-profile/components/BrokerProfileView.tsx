"use client";

import Link from "next/link";
import { useBrokerProfile } from "../hooks/useBrokerProfile";
import type { ProfileWindow } from "../types";

const crore = (v: number) => `${(v / 1e7).toFixed(2)} Cr`;

function WindowCard({ w }: { w: ProfileWindow }) {
  const sectors = Object.entries(w.sectors);
  const max = Math.max(1, ...sectors.map(([, v]) => Math.abs(v)));
  return (
    <section className="rounded border p-4">
      <h2 className="mb-2 text-lg font-semibold capitalize">
        {w.label} <span className="text-sm font-normal text-gray-500">({w.days} trading days)</span>
      </h2>
      {w.top_stocks.length === 0 ? (
        <p className="text-sm text-gray-500">No net accumulation.</p>
      ) : (
        <table className="w-full text-right text-sm tabular-nums">
          <thead>
            <tr className="border-b">
              <th className="text-left font-medium">Symbol</th>
              <th className="font-medium">Net qty</th>
              <th className="font-medium">Net Rs</th>
              <th className="font-medium">Buy VWAP</th>
            </tr>
          </thead>
          <tbody>
            {w.top_stocks.map((s) => (
              <tr key={s.symbol}>
                <td className="text-left">
                  <Link href={`/floorsheet?symbol=${s.symbol}`} className="underline">{s.symbol}</Link>
                </td>
                <td>{s.net_qty.toLocaleString("en-IN")}</td>
                <td>{crore(s.net_amt)}</td>
                <td>{s.buy_vwap?.toFixed(2) ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h3 className="mt-4 mb-1 text-sm font-medium">Sector rotation (net Rs)</h3>
      <ul className="space-y-1 text-xs">
        {sectors.map(([sector, v]) => (
          <li key={sector} className="flex items-center gap-2">
            <span className="w-20 shrink-0">{sector}</span>
            <span
              className={`h-2 rounded ${v >= 0 ? "bg-green-500" : "bg-red-500"}`}
              style={{ width: `${(Math.abs(v) / max) * 60}%` }}
            />
            <span className="tabular-nums">{crore(v)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BrokerProfileView({ broker }: { broker: number }) {
  const { data, error, isLoading } = useBrokerProfile(broker);
  if (isLoading) return <p>Loading…</p>;
  if (error) return <p className="text-red-600">{error.message}</p>;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {data?.windows.map((w) => <WindowCard key={w.label} w={w} />)}
    </div>
  );
}
