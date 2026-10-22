"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveFeed, useWhaleTrades } from "../hooks/useLiveFeed";
import type { WhaleTrade } from "../types";

const SHOW_MS = 8_000;
const MAX_TOASTS = 3;

/** Site-wide pop-ups for new block trades; trades already in the feed when the page opens stay silent. */
export function WhaleToasts() {
  useLiveFeed();
  const whales = useWhaleTrades();
  const seen = useRef<number | null>(null);
  const [toasts, setToasts] = useState<WhaleTrade[]>([]);

  useEffect(() => {
    // Newest first; the first non-empty feed only sets the baseline.
    const fresh = seen.current === null ? [] : whales.filter((w) => w.contract_no > (seen.current ?? 0));
    if (whales.length) seen.current = Math.max(seen.current ?? 0, ...whales.map((w) => w.contract_no));
    if (!fresh.length) return;
    setToasts((p) => [...fresh, ...p].slice(0, MAX_TOASTS));
    // No cleanup on purpose: each batch must expire on its own even when the next trade re-runs this effect.
    setTimeout(() => setToasts((p) => p.filter((x) => !fresh.includes(x))), SHOW_MS);
  }, [whales]);

  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((w) => (
        <div key={w.contract_no} className="rounded border border-amber-500 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-lg">
          <span className="font-semibold">{w.symbol}</span> {w.qty.toLocaleString()} @ {w.rate} · NPR{" "}
          {Math.round(w.amount).toLocaleString()}
          <span className="block text-xs text-zinc-400">
            broker {w.buyer_broker} ← {w.seller_broker}
          </span>
        </div>
      ))}
    </div>
  );
}
