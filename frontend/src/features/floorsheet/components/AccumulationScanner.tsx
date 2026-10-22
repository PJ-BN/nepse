"use client";

import { useAccumulation } from "../hooks/useFloorsheet";

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

/** Smart-money accumulation scan; criteria mirror ACCUM_* in backend domain/floorsheet/metrics.py. */
export function AccumulationScanner({ onSelect }: { onSelect: (symbol: string) => void }) {
  const { data, isLoading, error } = useAccumulation();
  return (
    <div>
      <p className="mb-2 text-xs text-gray-500">
        Last 10 complete sessions · top-5 net-buyer share &gt; 35% · ATR &lt; 4% of price
      </p>
      {isLoading ? (
        <p className="text-sm text-gray-500">Scanning…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error.message}</p>
      ) : !data?.length ? (
        <p className="text-sm text-gray-500">No scrips match right now.</p>
      ) : (
        <table className="w-full text-sm tabular-nums">
          <thead className="text-left text-gray-500">
            <tr>
              <th>#</th>
              <th>Symbol</th>
              <th className="text-right">Top-5 share</th>
              <th className="text-right">ATR</th>
              <th className="text-right">Brokers</th>
            </tr>
          </thead>
          <tbody>
            {data.map((h, i) => (
              <tr key={h.symbol} className="border-t">
                <td>{i + 1}</td>
                <td>
                  <button className="underline" title={h.sector ?? undefined} onClick={() => onSelect(h.symbol)}>
                    {h.symbol}
                  </button>
                </td>
                <td className="text-right">{pct(h.top5_share)}</td>
                <td className="text-right">{pct(h.atr_pct)}</td>
                <td className="text-right">{h.top_brokers.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
