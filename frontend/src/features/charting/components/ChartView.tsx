"use client";

import Link from "next/link";
import type { Chart } from "klinecharts";
import { useMemo, useState } from "react";
import { BrokerVwapOverlay, useBrokerAnalytics } from "@/features/floorsheet";
import { useHistory } from "../hooks/useHistory";
import { NepseLayers } from "../klines/nepse/NepseLayers";
import { INDEX_CODES, isIntraday, RESOLUTION_LABEL, RESOLUTIONS, type Indicator, type Resolution } from "../types";
import { NepseTradingChart } from "./NepseTradingChart";
import { SymbolSearch } from "./SymbolSearch";

/** One chart panel: its own symbol, timeframe and price mode. Height is set by the parent and drag-resizable. */
export function ChartView({
  symbol,
  onSymbolChange,
  onRemove,
  indicators,
  height,
}: {
  symbol: string;
  onSymbolChange: (s: string) => void;
  onRemove?: () => void;
  indicators: Indicator[];
  height: string;
}) {
  const [adjusted, setAdjusted] = useState(true);
  const [resolution, setResolution] = useState<Resolution>("1D");
  const [showVwap, setShowVwap] = useState(false);
  const [chart, setChart] = useState<Chart | null>(null);
  const isIndex = INDEX_CODES.includes(symbol);
  const intraday = isIntraday(resolution);
  const history = useHistory(symbol, adjusted, resolution);
  const analytics = useBrokerAnalytics(showVwap && !isIndex ? symbol : "", 30);
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
    <section className="flex min-w-0 flex-col gap-2 rounded border p-2">
      <div className="flex flex-wrap items-center gap-2">
        <SymbolSearch value={symbol} onSelect={onSymbolChange} />
        <div role="group" aria-label="Resolution" className="flex overflow-hidden rounded border text-xs">
          {RESOLUTIONS.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={resolution === r}
              onClick={() => setResolution(r)}
              className={`px-2 py-1 ${resolution === r ? "bg-foreground text-background" : ""}`}
            >
              {RESOLUTION_LABEL[r]}
            </button>
          ))}
        </div>
        {!isIndex && (
          <>
            <div role="group" aria-label="Price adjustment" className="flex overflow-hidden rounded border text-xs">
              {([true, false] as const).map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  aria-pressed={adjusted === v}
                  onClick={() => setAdjusted(v)}
                  className={`px-2 py-1 ${adjusted === v ? "bg-foreground text-background" : ""}`}
                >
                  {v ? "ADJ" : "UNADJ"}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={showVwap} onChange={(e) => setShowVwap(e.target.checked)} />
              Broker VWAP
            </label>
          </>
        )}
        <span className="ml-auto flex items-center gap-3 text-xs">
          {symbol && !isIndex && (
            <>
              <Link href={`/company/${symbol}`} className="text-blue-700 hover:underline">Company</Link>
              <NepseLayers chart={chart} symbol={symbol} candles={history.data ?? []} adjusted={adjusted} />
            </>
          )}
          {onRemove && (
            <button type="button" onClick={onRemove} aria-label="Remove chart" className="text-gray-500 hover:text-red-600">
              ✕
            </button>
          )}
        </span>
      </div>
      {!symbol && <p className="text-sm text-gray-500">Search a symbol or company to load its chart.</p>}
      {history.isError && <p className="text-sm text-red-600">Failed to load {symbol}: {String(history.error)}</p>}
      {history.isSuccess && history.data.length === 0 && (
        <p className="text-sm text-gray-500">
          {intraday
            ? `No ${RESOLUTION_LABEL[resolution]} data for ${symbol}: intraday bars only exist for days whose floorsheet was ingested${isIndex ? ", and indices have none" : ""}. Try 1D.`
            : `No price history for ${symbol}.`}
        </p>
      )}
      {symbol && (
        <div style={{ height, minHeight: 280 }} className="resize-y overflow-hidden rounded">
          <NepseTradingChart symbol={symbol} timeframe={resolution} candles={history.data ?? []} overlay={overlay} intraday={intraday} indicators={indicators} onChart={setChart} />
        </div>
      )}
    </section>
  );
}
