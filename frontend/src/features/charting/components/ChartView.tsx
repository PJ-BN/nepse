"use client";

import type { Chart, IndicatorCreate } from "klinecharts";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrokerVwapOverlay, useBrokerAnalytics } from "@/features/floorsheet";
import type { Alert } from "../alerts";
import { COMPARE, COMPARE_COLOR, normalise, registerCompare } from "../compare";
import { useHistory } from "../hooks/useHistory";
import { NepseLayers } from "../klines/nepse/NepseLayers";
import { visibleCandles } from "../replay";
import { INDEX_CODES, isIntraday, RESOLUTION_LABEL, RESOLUTIONS, type Candle, type Indicator, type Resolution } from "../types";
import { AlertControl } from "./Alerts";
import { NepseTradingChart } from "./NepseTradingChart";
import { ReplayBar } from "./ReplayBar";
import { SymbolSearch } from "./SymbolSearch";

const NO_CANDLES: Candle[] = [];

/** One chart panel: its own symbol, timeframe and price mode. Height is set by the parent and drag-resizable. */
export function ChartView({
  symbol,
  onSymbolChange,
  onRemove,
  indicators,
  height,
  onChart,
  alerts,
  onAddAlert,
  onRemoveAlert,
}: {
  symbol: string;
  onSymbolChange: (s: string) => void;
  onRemove?: () => void;
  indicators: Indicator[];
  height: string;
  /** The live klinecharts handle (null on teardown), for grid-level features such as crosshair/zoom sync. */
  onChart?: (c: Chart | null) => void;
  alerts: Alert[];
  onAddAlert: (a: Alert) => void;
  onRemoveAlert: (id: string) => void;
}) {
  const [adjusted, setAdjusted] = useState(true);
  const [resolution, setResolution] = useState<Resolution>("1D");
  const [showVwap, setShowVwap] = useState(false);
  const [chart, setChart] = useState<Chart | null>(null);
  const isIndex = INDEX_CODES.includes(symbol);
  const intraday = isIntraday(resolution);
  const history = useHistory(symbol, adjusted, resolution);
  const [replayIdx, setReplayIdx] = useState<number | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareSymbol, setCompareSymbol] = useState("");
  const [compareReady, setCompareReady] = useState(false);
  const compareHistory = useHistory(compareSymbol, adjusted, resolution);
  const full = history.data ?? NO_CANDLES;
  const candles = useMemo(() => visibleCandles(full, replayIdx), [full, replayIdx]);
  const [from, setFrom] = useState(0);
  const compare = useMemo(() => (compareHistory.data ? normalise(full, compareHistory.data, from) : null), [full, compareHistory.data, from]);
  // Re-basing on scroll swaps the indicator in the effect below; `extra` only changes when the overlay appears/disappears.
  const compareValues = useRef(compare?.values);
  compareValues.current = compare?.values;
  const hasCompare = compareReady && !!compare;
  const extra = useMemo<IndicatorCreate[]>(
    () =>
      hasCompare
        ? [{ name: COMPARE, extendData: compareValues.current, styles: { lines: [{ color: COMPARE_COLOR }] } as never }]
        : [],
    [hasCompare],
  );
  const mine = useMemo(() => alerts.filter((a) => a.symbol === symbol), [alerts, symbol]);

  useEffect(() => {
    // overrideIndicator does not recalculate on new extendData, so swap the indicator.
    if (!chart || !hasCompare) return;
    chart.removeIndicator({ name: COMPARE });
    chart.createIndicator({ name: COMPARE, extendData: compare?.values, styles: { lines: [{ color: COMPARE_COLOR }] } as never, paneId: "candle_pane" }, true);
  }, [chart, hasCompare, compare]);
  // The overlay is re-based on the first visible bar, like TradingView's compare, so scroll/zoom moves its start.
  useEffect(() => {
    if (!chart || !hasCompare) return;
    let t: ReturnType<typeof setTimeout>;
    const onRange = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const bar = chart.getDataList()[Math.max(chart.getVisibleRange().from, 0)];
        if (bar) setFrom(bar.timestamp / 1000);
      }, 150);
    };
    onRange();
    chart.subscribeAction("onVisibleRangeChange", onRange);
    return () => {
      clearTimeout(t);
      chart.unsubscribeAction("onVisibleRangeChange", onRange);
    };
  }, [chart, hasCompare]);
  useEffect(() => setReplayIdx(null), [symbol, resolution, adjusted]);
  useEffect(() => {
    import("klinecharts").then((k) => {
      registerCompare(k);
      setCompareReady(true);
    });
  }, []);
  const analytics = useBrokerAnalytics(showVwap && !isIndex ? symbol : "", 30);
  const overlay = useMemo(
    () => [
      ...(analytics.data
        ? BrokerVwapOverlay(analytics.data).map((l) => ({
            price: l.points[0].value,
            title: `${l.side === "buy" ? "B" : "S"}${l.broker} VWAP`,
            color: l.side === "buy" ? "#16a34a" : "#dc2626",
          }))
        : []),
      ...mine.map((a) => ({ price: a.price, title: "Alert", color: "#f59e0b" })),
    ],
    [analytics.data, mine],
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
        <ReplayBar chart={chart} full={full} idx={replayIdx} onIdx={setReplayIdx} />
        {compareOpen ? (
          <span className="flex items-center gap-1 text-xs">
            <span style={{ color: COMPARE_COLOR }}>vs</span>
            <SymbolSearch value={compareSymbol} onSelect={setCompareSymbol} />
            {compare?.pct != null && <span className="text-gray-500">{compare.pct >= 0 ? "+" : ""}{compare.pct.toFixed(1)}%</span>}
            <button
              type="button"
              aria-label="Remove comparison"
              onClick={() => {
                setCompareOpen(false);
                setCompareSymbol("");
              }}
            >
              ✕
            </button>
          </span>
        ) : (
          <button type="button" className="rounded border px-2 py-0.5 text-xs hover:bg-hover" onClick={() => setCompareOpen(true)}>
            + Compare
          </button>
        )}
        <AlertControl symbol={symbol} last={full.at(-1)?.close} alerts={mine} onAdd={onAddAlert} onRemove={onRemoveAlert} />
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
          <NepseTradingChart
            symbol={symbol}
            timeframe={resolution}
            candles={candles}
            overlay={overlay}
            intraday={intraday}
            indicators={indicators}
            extraIndicators={extra}
            onChart={(c) => {
              setChart(c);
              onChart?.(c);
            }}
          />
        </div>
      )}
    </section>
  );
}
