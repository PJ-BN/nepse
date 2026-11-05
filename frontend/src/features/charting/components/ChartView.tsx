"use client";

import type { Chart, IndicatorCreate } from "klinecharts";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrokerVwapOverlay, useBrokerAnalytics } from "@/features/floorsheet";
import type { Alert } from "../alerts";
import { COMPARE, COMPARE_COLOR, normalise, registerCompare } from "../compare";
import { useHistory } from "../hooks/useHistory";
import { useChartAi } from "../hooks/useChartAi";
import { NepseLayers } from "../klines/nepse/NepseLayers";
import { visibleCandles } from "../replay";
import { INDEX_CODES, isIntraday, RESOLUTION_LABEL, RESOLUTIONS, type Candle, type Indicator, type Resolution } from "../types";
import { AlertControl } from "./Alerts";
import { NepseTradingChart } from "./NepseTradingChart";
import { ReplayBar } from "./ReplayBar";
import { SymbolSearch } from "./SymbolSearch";
import { AiChartSidebar } from "./AiChartSidebar";
import { useActionLoader } from "@/shared/ui";
import { useAuth } from "@/features/auth";

const NO_CANDLES: Candle[] = [];

/** Full viewport interactive chart panel: unified trading toolbar + opposite-side AI analysis sidebar. */
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
  onApplyIndicators,
}: {
  symbol: string;
  onSymbolChange: (s: string) => void;
  onRemove?: () => void;
  indicators: Indicator[];
  height?: string;
  /** The live klinecharts handle (null on teardown), for grid-level features such as crosshair/zoom sync. */
  onChart?: (c: Chart | null) => void;
  alerts: Alert[];
  onAddAlert: (a: Alert) => void;
  onRemoveAlert: (id: string) => void;
  onApplyIndicators?: (next: Indicator[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [adjusted, setAdjusted] = useState(true);
  const [resolution, setResolution] = useState<Resolution>("1D");
  const [showVwap, setShowVwap] = useState(false);
  const [chart, setChart] = useState<Chart | null>(null);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  // Clean view on switch: hide AI analysis panel when switching symbols
  useEffect(() => {
    setShowAiAnalysis(false);
  }, [symbol]);

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFs);
    return () => document.removeEventListener("fullscreenchange", handleFs);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const ai = useChartAi(symbol, resolution, full, chart, onApplyIndicators);
  const { withLoader } = useActionLoader();
  const { isAuthenticated, openAuthModal } = useAuth();

  const handleToggleAiAnalysis = async () => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }

    if (showAiAnalysis) {
      setShowAiAnalysis(false);
      return;
    }

    // If we already have the analysis cached for this symbol & timeframe, just show sidebar
    if (ai.data) {
      setShowAiAnalysis(true);
      return;
    }

    await withLoader(
      async (update) => {
        update({
          title: `AI Technical Analysis: ${symbol} (${resolution})`,
          subtitle: "Analyzing candlestick price action, indicators, and swing pivots with AGY...",
          steps: [
            "Extracting candlestick history and price swings",
            "Generating AGY AI trade setup, targets, and research article",
            "Plotting automated trendlines, zones & indicators on chart",
          ],
          currentStepIndex: 0,
        });

        const analysis = await ai.analyzeWithAgy();
        update({ currentStepIndex: 1 });

        await new Promise((r) => setTimeout(r, 200));

        update({ currentStepIndex: 2 });
        if (chart) {
          ai.applyDrawingsToChart(analysis);
        }
        setShowAiAnalysis(true);

        await new Promise((r) => setTimeout(r, 300));
      },
      {
        title: `AI Technical Analysis: ${symbol} (${resolution})`,
        subtitle: "Processing price action, indicators, and drawings...",
      }
    );
  };

  const handleRefreshAi = async () => {
    await withLoader(
      async (update) => {
        update({
          title: `Refreshing AI Technical Analysis: ${symbol}`,
          subtitle: "Recalibrating swing pivots, recalculating indicators and updating chart drawings...",
          steps: [
            "Running fresh AGY analysis scan",
            "Re-computing key support, resistance and trendlines",
            "Updating chart overlays and trade setup",
          ],
          currentStepIndex: 0,
        });

        const analysis = await ai.refreshAiAsync();
        update({ currentStepIndex: 1 });

        if (chart) {
          ai.applyDrawingsToChart(analysis);
        }
        update({ currentStepIndex: 2 });

        await new Promise((r) => setTimeout(r, 300));
      },
      {
        title: `Refreshing AI Technical Analysis: ${symbol}`,
        subtitle: "Updating technical evaluation and drawings...",
      }
    );
  };

  const handleApplyDrawings = async () => {
    await withLoader(
      async (update) => {
        update({
          title: `Plotting AI Overlays on Chart`,
          subtitle: `Drawing trendlines, key pivots, and support/resistance zones for ${symbol}...`,
        });
        ai.applyDrawingsToChart();
        await new Promise((r) => setTimeout(r, 250));
      },
      {
        title: `Plotting AI Overlays on Chart`,
        subtitle: "Drawing technical tools...",
      }
    );
  };

  const handleApplyIndicators = async () => {
    await withLoader(
      async (update) => {
        update({
          title: "Configuring AI Technical Indicators",
          subtitle: "Mounting recommended indicators onto chart panes...",
        });
        ai.applyRecommendedIndicators();
        await new Promise((r) => setTimeout(r, 300));
      },
      {
        title: "Configuring AI Technical Indicators",
        subtitle: "Applying recommended indicators to active chart...",
      }
    );
  };

  useEffect(() => {
    if (!chart || !hasCompare) return;
    chart.removeIndicator({ name: COMPARE });
    chart.createIndicator({ name: COMPARE, extendData: compare?.values, styles: { lines: [{ color: COMPARE_COLOR }] } as never, paneId: "candle_pane" }, true);
  }, [chart, hasCompare, compare]);

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

  // Unified top header leading items
  const headerLeading = (
    <div className="flex items-center gap-1.5 shrink-0">
      <SymbolSearch value={symbol} onSelect={onSymbolChange} />

      {/* Timeframe buttons */}
      <div role="group" aria-label="Resolution" className="flex overflow-hidden rounded-lg border border-border bg-background text-xs">
        {RESOLUTIONS.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={resolution === r}
            onClick={() => setResolution(r)}
            className={`px-2 py-1 transition-colors cursor-pointer ${
              resolution === r
                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {RESOLUTION_LABEL[r]}
          </button>
        ))}
      </div>

      {!isIndex && (
        <>
          {/* Price adjustment toggle */}
          <div role="group" aria-label="Price adjustment" className="flex overflow-hidden rounded-lg border border-border bg-background text-xs">
            {([true, false] as const).map((v) => (
              <button
                key={String(v)}
                type="button"
                aria-pressed={adjusted === v}
                onClick={() => setAdjusted(v)}
                className={`px-2 py-1 transition-colors cursor-pointer ${
                  adjusted === v
                    ? "bg-foreground text-background font-bold shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {v ? "ADJ" : "UNADJ"}
              </button>
            ))}
          </div>

          {/* VWAP Toggle */}
          <label className="flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium cursor-pointer hover:bg-muted select-none">
            <input
              type="checkbox"
              checked={showVwap}
              onChange={(e) => setShowVwap(e.target.checked)}
              className="rounded"
            />
            <span className="hidden sm:inline">Broker </span>VWAP
          </label>
        </>
      )}

      <ReplayBar chart={chart} full={full} idx={replayIdx} onIdx={setReplayIdx} />

      {/* Compare modal / bar */}
      {compareOpen ? (
        <span className="flex items-center gap-1 text-xs">
          <span style={{ color: COMPARE_COLOR }} className="font-bold">vs</span>
          <SymbolSearch value={compareSymbol} onSelect={setCompareSymbol} />
          {compare?.pct != null && (
            <span className="font-mono font-bold text-xs" style={{ color: COMPARE_COLOR }}>
              {compare.pct >= 0 ? "+" : ""}{compare.pct.toFixed(1)}%
            </span>
          )}
          <button
            type="button"
            aria-label="Remove comparison"
            onClick={() => {
              setCompareOpen(false);
              setCompareSymbol("");
            }}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ✕
          </button>
        </span>
      ) : (
        <button
          type="button"
          className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-muted cursor-pointer"
          onClick={() => setCompareOpen(true)}
        >
          + Compare
        </button>
      )}

      <AlertControl
        symbol={symbol}
        last={full.at(-1)?.close}
        alerts={mine}
        onAdd={onAddAlert}
        onRemove={onRemoveAlert}
      />
    </div>
  );

  // Unified top header trailing items
  const headerTrailing = (
    <div className="flex items-center gap-1.5 shrink-0">
      {symbol && !isIndex && (
        <>
          <Link
            href={`/company/${symbol}`}
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-semibold text-primary hover:bg-muted transition-colors hidden xl:inline-block"
          >
            Company
          </Link>
          <NepseLayers chart={chart} symbol={symbol} candles={history.data ?? []} adjusted={adjusted} />
        </>
      )}

      {/* AI Technical Analysis Button */}
      {symbol && (
        <button
          type="button"
          onClick={handleToggleAiAnalysis}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold transition-all shadow-xs cursor-pointer ${
            showAiAnalysis
              ? "border-primary bg-primary text-primary-foreground shadow-sm"
              : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
          }`}
          title={isAuthenticated ? "Open AI Technical Analysis Sidebar" : "Sign in to unlock AI Technical Analysis"}
        >
          <span>{isAuthenticated ? "✨" : "🔒"}</span>
          <span className="hidden sm:inline">AI Technical Analysis</span>
          <span className="sm:hidden">AI Analysis</span>
          {!isAuthenticated && (
            <span className="rounded bg-primary/20 px-1 py-0.2 text-[9px] font-bold uppercase">
              Sign in
            </span>
          )}
          {isAuthenticated && ai.data && (
            <span className="rounded bg-black/20 dark:bg-white/20 px-1.5 py-0.2 text-[9px] font-extrabold uppercase">
              {ai.data.stance}
            </span>
          )}
        </button>
      )}

      {/* Fullscreen Button */}
      <button
        type="button"
        onClick={toggleFullscreen}
        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
        aria-label="Toggle Fullscreen"
        className="rounded-lg border border-border bg-background p-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
      >
        {isFullscreen ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="4 14 10 14 10 20" />
            <polyline points="20 10 14 10 14 4" />
            <line x1="14" y1="10" x2="21" y2="3" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        )}
      </button>

      {/* Toggle Right AI Sidebar */}
      {symbol && (
        <button
          type="button"
          onClick={() => setShowAiAnalysis((prev) => !prev)}
          title={showAiAnalysis ? "Hide AI Sidebar" : "Show AI Sidebar"}
          aria-label="Toggle AI Sidebar"
          className={`rounded-lg border p-1.5 text-xs transition-colors cursor-pointer ${
            showAiAnalysis
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M15 3v18" />
            <path d={showAiAnalysis ? "m10 9 3 3-3 3" : "m11 15-3-3 3-3"} />
          </svg>
        </button>
      )}

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove chart"
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 transition-colors cursor-pointer"
        >
          ✕
        </button>
      )}
    </div>
  );

  return (
    <div
      ref={containerRef}
      style={{ height: height || "100%" }}
      className="flex h-full w-full flex-col min-h-0 overflow-hidden bg-background relative"
    >
      <div className="flex-1 min-h-0 flex relative overflow-hidden">
        {/* Main interactive chart */}
        <div className="flex-1 min-w-0 h-full flex flex-col relative">
          {symbol ? (
            <NepseTradingChart
              symbol={symbol}
              timeframe={resolution}
              candles={candles}
              overlay={overlay}
              intraday={intraday}
              indicators={indicators}
              extraIndicators={extra}
              headerLeading={headerLeading}
              headerTrailing={headerTrailing}
              onChart={(c) => {
                setChart(c);
                onChart?.(c);
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              <div className="space-y-2">
                <div className="text-4xl">📈</div>
                <p className="font-bold text-foreground">No Stock or Index Selected</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Search a symbol (e.g. NEPSE, NABIL, HDL, GBIME) in the top search box to load the interactive chart.
                </p>
              </div>
            </div>
          )}

          {/* Floating AI Pill on right edge when AI panel is closed */}
          {!showAiAnalysis && symbol && (
            <button
              type="button"
              onClick={handleToggleAiAnalysis}
              title="Open AI Technical Analysis (Opposite Sidebar)"
              className="absolute right-3 top-14 z-20 flex items-center gap-1.5 rounded-full border border-primary/40 bg-card/95 px-3 py-1.5 text-xs font-bold text-primary shadow-lg backdrop-blur-md hover:bg-card hover:scale-105 transition-all cursor-pointer select-none"
            >
              <span>✨</span>
              <span className="hidden sm:inline">AI Analysis</span>
              {ai.data && (
                <span className="rounded bg-primary/20 px-1.5 py-0.2 text-[9px] font-extrabold uppercase">
                  {ai.data.stance}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Opposite-Side Navbar: Collapsible Right Sidebar for AI Technical Analysis */}
        {showAiAnalysis && symbol && (
          <AiChartSidebar
            symbol={symbol}
            resolution={resolution}
            analysis={ai.data}
            isLoading={ai.isLoading}
            isRefreshing={ai.isRefreshing}
            isError={ai.isError}
            error={ai.error}
            onRefresh={handleRefreshAi}
            onRunAnalysis={handleToggleAiAnalysis}
            onApplyDrawings={handleApplyDrawings}
            onClearDrawings={() => ai.clearAiDrawings()}
            onApplyIndicators={handleApplyIndicators}
            isOverlaysActive={ai.isAiOverlaysActive}
            onClose={() => setShowAiAnalysis(false)}
          />
        )}
      </div>
    </div>
  );
}
