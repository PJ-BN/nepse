"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHistory } from "../hooks/useHistory";
import { NepseTradingChart } from "./NepseTradingChart";

export function ChartView({ symbol }: { symbol: string }) {
  const router = useRouter();
  const [adjusted, setAdjusted] = useState(true);
  const [input, setInput] = useState(symbol);
  const history = useHistory(symbol, adjusted);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const next = input.trim().toUpperCase();
            if (next) router.push(`/chart?symbol=${encodeURIComponent(next)}`);
          }}
        >
          <label className="sr-only" htmlFor="symbol">Symbol</label>
          <input
            id="symbol"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Symbol, e.g. NABIL"
            className="rounded border px-2 py-1 font-mono uppercase"
          />
        </form>
        <div role="group" aria-label="Price adjustment" className="flex overflow-hidden rounded border text-xs">
          {([true, false] as const).map((v) => (
            <button
              key={String(v)}
              type="button"
              aria-pressed={adjusted === v}
              onClick={() => setAdjusted(v)}
              className={`px-3 py-1 ${adjusted === v ? "bg-foreground text-background" : ""}`}
            >
              {v ? "ADJ" : "UNADJ"}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500">SMA 20 (amber) · SMA 50 (blue) · RSI 14</span>
      </div>
      {!symbol && <p className="text-sm text-gray-500">Enter a symbol to load its chart.</p>}
      {history.isError && <p className="text-sm text-red-600">Failed to load {symbol}: {String(history.error)}</p>}
      {history.data?.length === 0 && <p className="text-sm text-gray-500">No price history for {symbol}.</p>}
      {symbol && <NepseTradingChart candles={history.data ?? []} />}
    </div>
  );
}
