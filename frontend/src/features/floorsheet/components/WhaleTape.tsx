"use client";

import { useWhales } from "../hooks/useFloorsheet";
import type { WhaleEvent } from "../types";

type Props = {
  symbol?: string;
  /**
   * HOOK POINT (live-feed): feat/charting's live-feed subscribes to the `whale` WS topic and passes the
   * received `data` objects here, newest first. They are shown on top of the REST snapshot, deduped by contract_no.
   */
  live?: WhaleEvent[];
};

export function WhaleTape({ symbol, live = [] }: Props) {
  const { data = [], isLoading } = useWhales(symbol);
  const seen = new Set<number>();
  const trades = [...live.filter((w) => !symbol || w.symbol === symbol), ...data]
    .filter((w) => !seen.has(w.contract_no) && seen.add(w.contract_no))
    .slice(0, 50);

  if (isLoading) return <p className="text-sm text-gray-500">Loading whale trades…</p>;
  if (trades.length === 0) return <p className="text-sm text-gray-500">No whale trades on the latest trading day.</p>;
  return (
    <ul className="max-h-96 divide-y overflow-y-auto text-sm tabular-nums">
      {trades.map((w) => (
        <li key={w.contract_no} className="flex justify-between gap-3 py-1">
          <span className="text-gray-500">{w.trade_time.slice(11, 19)}</span>
          <span className="font-medium">{w.symbol}</span>
          <span>
            #{w.seller_broker} → #{w.buyer_broker}
          </span>
          <span>{w.qty.toLocaleString("en-IN")} @ {w.rate.toFixed(2)}</span>
          <span>Rs {(w.amount / 1e5).toFixed(2)} L</span>
        </li>
      ))}
    </ul>
  );
}
