"use client";

import Link from "next/link";
import { useWhales } from "../hooks/useFloorsheet";
import type { WhaleEvent } from "../types";

type Props = {
  symbol?: string;
  live?: WhaleEvent[];
};

export function WhaleTape({ symbol, live = [] }: Props) {
  const { data = [], isLoading } = useWhales(symbol);
  const seen = new Set<number>();
  const trades = [...live.filter((w) => !symbol || w.symbol === symbol), ...data]
    .filter((w) => !seen.has(w.contract_no) && seen.add(w.contract_no))
    .slice(0, 50);

  if (isLoading) {
    return <p className="text-xs text-muted-foreground py-4 text-center">Loading whale trades…</p>;
  }

  if (trades.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground">
        No block trades recorded for the selected session.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
      <ul className="max-h-[30rem] divide-y divide-border/50 overflow-y-auto text-xs tabular-nums [scrollbar-width:thin]">
        {trades.map((w) => (
          <li key={w.contract_no} className="p-3 hover:bg-muted/30 transition-colors space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link
                  href={`/chart?symbol=${encodeURIComponent(w.symbol)}`}
                  className="font-mono font-bold text-primary hover:underline text-xs"
                >
                  {w.symbol}
                </Link>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {w.trade_time.slice(11, 19)}
                </span>
              </div>
              <span className="font-mono font-bold text-foreground">
                Rs. {(w.amount / 1e5).toFixed(2)} Lakhs
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-mono">
                #{w.seller_broker} → #{w.buyer_broker}
              </span>
              <span className="font-mono">
                {w.qty.toLocaleString("en-IN")} shares @ {w.rate.toFixed(2)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
