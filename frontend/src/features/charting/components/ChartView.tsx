"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BrokerVwapOverlay, useBrokerAnalytics } from "@/features/floorsheet";
import { useHistory } from "../hooks/useHistory";
import { RESOLUTIONS, type Resolution } from "../types";
import { NepseTradingChart } from "./NepseTradingChart";

export function ChartView({ symbol }: { symbol: string }) {
  const router = useRouter();
  const [adjusted, setAdjusted] = useState(true);
  const [input, setInput] = useState(symbol);
  const [resolution, setResolution] = useState<Resolution>("1D");
  const [showVwap, setShowVwap] = useState(false);
  const history = useHistory(symbol, adjusted, resolution);
  const analytics = useBrokerAnalytics(showVwap ? symbol : "", 30);
  const overlay = useMemo(
    () =>
      analytics.data
        ? BrokerVwapOverlay(analytics.data).map((l) => ({
            price: l.points[0].value,
            title: `${l.side === "buy" ? "B" : "S"}${l.broker} VWAP`,
            color: l.side === "buy" ? "#16a34a" : "#dc2626",
          }))
        : [],
    [analytics.data],
  );

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
        <div role="group" aria-label="Resolution" className="flex overflow-hidden rounded border text-xs">
          {RESOLUTIONS.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={resolution === r}
              onClick={() => setResolution(r)}
              className={`px-3 py-1 ${resolution === r ? "bg-foreground text-background" : ""}`}
            >
              {r === "1D" ? "1D" : r === "60" ? "1h" : `${r}m`}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={showVwap} onChange={(e) => setShowVwap(e.target.checked)} />
          Broker VWAP (30d)
        </label>
        <span className="text-xs text-gray-500">SMA 20 (amber) · SMA 50 (blue) · RSI 14</span>
      </div>
      {!symbol && <p className="text-sm text-gray-500">Enter a symbol to load its chart.</p>}
      {history.isError && <p className="text-sm text-red-600">Failed to load {symbol}: {String(history.error)}</p>}
      {history.data?.length === 0 && <p className="text-sm text-gray-500">No price history for {symbol}.</p>}
      {symbol && <NepseTradingChart candles={history.data ?? []} overlay={overlay} intraday={resolution !== "1D"} />}
    </div>
  );
}
