"use client";

import type { Chart, IndicatorCreate, KLineData, OverlayCreate, OverlayMode } from "klinecharts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ALL_TF, extendOf, stripId, loadDrawings, saveDrawings, syncCloudDrawings, snapshot, type Drawing } from "../drawings";
import { applyParams, DEFAULT_SETTINGS, deleteLayout, loadLayouts, loadSettings, saveLayout, saveSettings, syncCloudLayoutsOnAuth, type ChartSettings, type IndicatorParams } from "../settings";
import { History } from "../undo";
import { DEFAULT_INDICATORS, type Candle, type Indicator, type PriceOverlay } from "../types";
import { isMainIndicator, registerIndicators } from "../klines/indicators";
import { registerOverlays } from "../klines/overlays";
import { CHART_TYPES, DrawingToolbar, IndicatorMenu, TOOL_NAMES } from "./ChartTools";
import { IndicatorSettings, LayoutMenu, PropertiesPanel } from "./EditPanels";

const UP = "#16a34a";
const DOWN = "#dc2626";
const MAIN = "candle_pane";
const MAGNETS: OverlayMode[] = ["normal", "weak_magnet", "strong_magnet"];
const AXES = [
  { value: "normal", label: "Linear" },
  { value: "percentage", label: "%" },
  { value: "logarithm", label: "Log" },
] as const;

const barStyles = {
  candle: {
    bar: {
      upColor: UP, downColor: DOWN, noChangeColor: "#888",
      upBorderColor: UP, downBorderColor: DOWN, noChangeBorderColor: "#888",
      upWickColor: UP, downWickColor: DOWN, noChangeWickColor: "#888",
    },
  },
  grid: { horizontal: { color: "rgba(128,128,128,0.1)" }, vertical: { color: "rgba(128,128,128,0.1)" } },
};

// The grid's indicator list → klinecharts indicators. Same-type entries share one indicator (one param per line).
const KIND: Record<import("../types").IndicatorType, readonly [string, boolean]> = {
  sma: ["MA", true],
  ema: ["EMA", true],
  wma: ["WMA", true],
  hma: ["HMA", true],
  dema: ["DEMA", true],
  tema: ["TEMA", true],
  vwma: ["VWMA", true],
  bb: ["BOLL", true],
  envelopes: ["ENVELOPES", true],
  supertrend: ["SUPERTREND", true],
  keltner: ["KELTNER", true],
  donchian: ["DONCHIAN", true],
  rsi: ["RSI", false],
  macd: ["MACD", false],
  mfi: ["MFI", false],
  cmf: ["CMF", false],
  aroon: ["AROON", false],
  tsi: ["TSI", false],
  ppo: ["PPO", false],
  cmo: ["CMO", false],
  atr: ["ATR", false],
  adx: ["ADX", false],
};

function fromList(list: Indicator[]): IndicatorCreate[] {
  const out: IndicatorCreate[] = [];
  for (const type of Object.keys(KIND) as (keyof typeof KIND)[]) {
    const items = list.filter((i) => i.type === type);
    if (!items.length) continue;
    const [name, main] = KIND[type];
    const ind: IndicatorCreate = { name };
    if (type === "bb") {
      ind.calcParams = [items[0].period, 2];
    } else if (type === "envelopes") {
      ind.calcParams = [items[0].period, 2.5];
    } else if (type === "supertrend") {
      ind.calcParams = [items[0].period, 3];
    } else if (type !== "macd") {
      ind.calcParams = items.map((i) => i.period);
    }
    if (type !== "macd") ind.styles = { lines: items.map((i) => ({ color: i.color })) } as never;
    if (main) ind.paneId = MAIN;
    out.push(ind);
  }
  return out;
}

const NO_INDICATORS: IndicatorCreate[] = [];

/**
 * Candles with a TradingView-style drawing toolbar, indicator menu and per-symbol saved drawings (klinecharts v10).
 * Fills its parent, so the parent decides the size (and can be drag-resized).
 */
export function NepseTradingChart({
  candles,
  overlay = [],
  intraday = false,
  indicators = DEFAULT_INDICATORS,
  symbol = "",
  timeframe,
  onChart,
  extraIndicators = NO_INDICATORS,
  headerLeading,
  headerTrailing,
}: {
  candles: Candle[];
  overlay?: PriceOverlay[];
  intraday?: boolean;
  indicators?: Indicator[];
  symbol?: string;
  /** Resolution the chart shows (drawings are saved per symbol + timeframe). Defaults from `intraday`. */
  timeframe?: string;
  /** Called with the live chart once it is ready (null on teardown), for panels outside this component. */
  onChart?: (chart: Chart | null) => void;
  /** Extra main-pane indicators (e.g. a compare overlay) that survive the indicator rebuild. */
  extraIndicators?: IndicatorCreate[];
  /** Leading items for unified top toolbar */
  headerLeading?: React.ReactNode;
  /** Trailing items for unified top toolbar */
  headerTrailing?: React.ReactNode;
}) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<Chart | null>(null);
  const data = useRef<KLineData[]>([]);
  const symbolRef = useRef(symbol);
  const onChartRef = useRef(onChart);
  onChartRef.current = onChart;
  const magnetRef = useRef<OverlayMode>("normal");
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const activeRef = useRef<string | null>(null);
  activeRef.current = active;
  const [continuous, setContinuous] = useState(false);
  const continuousRef = useRef(false);
  continuousRef.current = continuous;
  const activeOverlayIdRef = useRef<string | null>(null);
  const [magnet, setMagnet] = useState<OverlayMode>("normal");
  const [locked, setLocked] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [settings, setSettings] = useState<ChartSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef(DEFAULT_SETTINGS);
  const [layouts, setLayouts] = useState<Record<string, ChartSettings>>({});
  const [panel, setPanel] = useState<"indicators" | "layouts" | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // Close Settings / Layouts panel on outside click
  useEffect(() => {
    if (!panel) return;
    const handleDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanel(null);
      }
    };
    window.addEventListener("mousedown", handleDown);
    return () => window.removeEventListener("mousedown", handleDown);
  }, [panel]);
  const [, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);
  const tf = timeframe ?? (intraday ? "intraday" : "1D");
  const tfRef = useRef(tf);
  const allIds = useRef(new Set<string>());
  const history = useRef(new History<Drawing[]>([]));
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { type, axis, extras, removed } = settings;
  const derived = useMemo(() => fromList(indicators), [indicators]);

  const update = (patch: Partial<ChartSettings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    saveSettings(next);
  };

  // The finished drawings on the chart, without ids (ids change when a snapshot is re-created).
  const read = () => snapshot(chart.current!, tfRef.current, allIds.current).map(stripId);

  // Deferred so removals/moves have settled; one undo step per burst of changes.
  const persist = useCallback((delay = 0) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!chart.current) return;
      const now = read();
      history.current.push(now);
      saveDrawings(symbolRef.current, tfRef.current, now);
      setTick((t) => t + 1);
    }, delay);
  }, []);

  const cancelActiveDrawing = useCallback(() => {
    if (activeOverlayIdRef.current && chart.current) {
      const o = chart.current.getOverlays({ id: activeOverlayIdRef.current })[0];
      if (o && (o.currentStep ?? 0) >= 0) {
        chart.current.removeOverlay({ id: activeOverlayIdRef.current });
      }
    }
    activeOverlayIdRef.current = null;
    setActive(null);
  }, []);

  const draw = useCallback(
    (o: Partial<OverlayCreate> & { name: string }) => {
      if (!o.name || !chart.current) return;
      return chart.current.createOverlay({
        mode: magnetRef.current,
        onDrawEnd: () => {
          activeOverlayIdRef.current = null;
          persist();
          if (continuousRef.current && activeRef.current) {
            setTimeout(() => {
              if (activeRef.current && chart.current) {
                const nextId = draw({ name: activeRef.current });
                if (typeof nextId === "string") {
                  activeOverlayIdRef.current = nextId;
                }
              }
            }, 60);
          } else {
            setActive(null);
          }
        },
        onPressedMoveEnd: () => persist(),
        onRemoved: (e) => {
          if (activeOverlayIdRef.current === e.overlay.id) {
            activeOverlayIdRef.current = null;
          }
          setSelected((s) => (s === e.overlay.id ? null : s));
          persist();
        },
        onSelected: (e) => setSelected(e.overlay.id),
        onDeselected: (e) => setSelected((s) => (s === e.overlay.id ? null : s)),
        onRightClick: (e) => {
          chart.current?.removeOverlay({ id: e.overlay.id });
        },
        ...o,
      });
    },
    [persist],
  );

  useEffect(() => {
    const dark = () => document.documentElement.classList.contains("dark");
    // Bar times are already shifted to Nepal time as if UTC (see api.ts), so render in UTC.
    const node = el.current!;
    let cleanup = () => {};
    let dead = false;
    // klinecharts touches `window` on import, so it can't be loaded during SSR.
    import("klinecharts").then((k) => {
      const { dispose, init } = k;
      if (dead) return;
      registerIndicators(k);
      registerOverlays(k);
      const c = init(node, { timezone: "UTC", styles: dark() ? "dark" : "light" })!;
      c.setStyles(barStyles);
      c.setDataLoader({ getBars: ({ callback }) => callback(data.current, false) });
      c.setSymbol({ ticker: symbolRef.current || "NEPSE", pricePrecision: 2, volumePrecision: 0 });
      c.setPeriod({ type: "day", span: 1 });
      chart.current = c;
      const theme = new MutationObserver(() => {
        c.setStyles(dark() ? "dark" : "light");
        c.setStyles(barStyles);
      });
      theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      const size = new ResizeObserver(() => c.resize());
      size.observe(node);
      cleanup = () => {
        theme.disconnect();
        size.disconnect();
        dispose(node);
        chart.current = null;
        onChartRef.current?.(null);
      };
      setReady(true);
      onChartRef.current?.(c);
    });
    return () => {
      dead = true;
      cleanup();
    };
  }, []);

  useEffect(() => {
    data.current = candles.map((c) => ({ ...c, timestamp: c.time * 1000 }));
    chart.current?.setPeriod({ type: intraday ? "minute" : "day", span: 1 });
    chart.current?.resetData();
  }, [candles, intraday, ready]);

  // Rebuilt whenever the grid's indicator list or the menu's extras/removals change; params are re-applied on top.
  useEffect(() => {
    const c = chart.current;
    if (!c) return;
    const { params } = settingsRef.current;
    c.removeIndicator();
    if (!removed.includes("VOL")) c.createIndicator("VOL", false);
    derived.filter((i) => !removed.includes(i.name)).forEach((i) => c.createIndicator(i, i.paneId === MAIN));
    extraIndicators.forEach((i) => c.createIndicator({ ...i, paneId: MAIN }, true));
    extras.forEach((name) => {
      if (!derived.some((d) => d.name === name)) c.createIndicator(isMainIndicator(name) ? { name, paneId: MAIN } : name, isMainIndicator(name));
    });
    c.getIndicators().forEach((ind) => params[ind.name] && applyParams(c, ind, params[ind.name]));
    bump();
  }, [derived, extras, extraIndicators, removed, ready]);

  const render = useCallback(
    (list: Drawing[]) => {
      chart.current?.removeOverlay();
      allIds.current.clear();
      setSelected(null);
      list.forEach(({ tf: t, ...d }) => {
        const id = draw(d as never);
        if (typeof id === "string" && t === ALL_TF) allIds.current.add(id);
      });
    },
    [draw],
  );

  // Swap in the saved drawings for the new symbol/timeframe, with a fresh undo history.
  useEffect(() => {
    const c = chart.current;
    symbolRef.current = symbol;
    tfRef.current = tf;
    if (!c) return;
    render(loadDrawings(symbol, tf));
    history.current.reset(read());
    setTick((t) => t + 1);

    // If authenticated, sync with PostgreSQL database in background
    let active = true;
    syncCloudDrawings(symbol).then((allDrawings) => {
      if (!active || !chart.current) return;
      const relevant = allDrawings.filter((d) => d.tf === tf || d.tf === ALL_TF);
      render(relevant);
      history.current.reset(read());
      setTick((t) => t + 1);
    });

    return () => {
      active = false;
    };
  }, [symbol, tf, render, ready]);

  // Saved settings (indicator params, chart type, scale) are read after mount so SSR markup matches.
  useEffect(() => {
    const s = loadSettings();
    settingsRef.current = s;
    setSettings(s);
    setLayouts(loadLayouts());
    syncCloudLayoutsOnAuth().then((syncedLayouts) => {
      setLayouts(syncedLayouts);
    });
  }, []);

  useEffect(() => {
    const c = chart.current;
    if (!c) return;
    c.setStyles({ candle: { type: type as never } });
    c.overrideYAxis({ name: axis, paneId: MAIN });
  }, [type, axis, ready]);

  const commit = (next: Drawing[]) => {
    history.current.push(next);
    render(next);
    saveDrawings(symbolRef.current, tfRef.current, next);
    bump();
  };
  const step = (dir: "undo" | "redo") => {
    const prev = history.current[dir]();
    if (!prev) return;
    render(prev);
    saveDrawings(symbolRef.current, tfRef.current, prev);
    bump();
  };

  useEffect(() => {
    if (!chart.current) return;
    const ids = overlay.map((o) =>
      chart.current?.createOverlay({
        name: "horizontalStraightLine",
        groupId: "vwap",
        lock: true,
        points: [{ value: o.price }],
        styles: { line: { color: o.color, style: "dashed" } } as never,
      }),
    );
    return () => {
      ids.forEach((id) => typeof id === "string" && chart.current?.removeOverlay({ id }));
    };
  }, [overlay, ready]);

  const apply = (patch: Partial<OverlayCreate>) => chart.current?.overrideOverlay(patch);
  const mine = () => chart.current?.getOverlays().filter((o) => o.groupId !== "vwap") ?? [];
  const base = ["VOL", ...derived.map((d) => d.name)];
  const activeNames = new Set([...base, ...extras].filter((n) => !removed.includes(n)));
  const sel = selected ? chart.current?.getOverlays({ id: selected })[0] : undefined;
  const removeIndicator = (name: string) =>
    update(base.includes(name) ? { removed: [...removed, name] } : { extras: extras.filter((x) => x !== name) });

  return (
    <div
      className="flex h-full w-full flex-col min-h-0 overflow-hidden outline-none bg-background select-none"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).closest("input, select, textarea")) return;
        const k = e.key.toLowerCase();
        if (e.key === "Escape") {
          cancelActiveDrawing();
        } else if ((e.ctrlKey || e.metaKey) && k === "z") {
          e.preventDefault();
          step(e.shiftKey ? "redo" : "undo");
        } else if ((e.ctrlKey || e.metaKey) && k === "y") {
          e.preventDefault();
          step("redo");
        } else if ((k === "delete" || k === "backspace") && selected) {
          chart.current?.removeOverlay({ id: selected });
        }
      }}
    >
      {/* Unified Sleek Top Trading Header */}
      <div className="shrink-0 relative z-30 flex flex-wrap items-center justify-between border-b border-border/80 bg-card/95 px-2.5 py-1.5 gap-2 text-xs select-none">
        {/* Left section: Leading props (Symbol, Timeframe, etc.) + Chart Type + Scale */}
        <div className="flex items-center gap-1.5 shrink-0">
          {headerLeading}

          <div className="h-4 w-px bg-border/70 mx-0.5" />

          {/* Chart Type */}
          <select
            aria-label="Chart type"
            value={type}
            onChange={(e) => update({ type: e.target.value })}
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium cursor-pointer hover:bg-muted focus:outline-none"
          >
            {CHART_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {/* Price Scale (Linear, %, Log) */}
          <select
            aria-label="Price scale"
            value={axis}
            onChange={(e) => update({ axis: e.target.value })}
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium cursor-pointer hover:bg-muted focus:outline-none"
          >
            {AXES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        {/* Center section: Quick Indicators, Full Indicators Menu, Settings, Layouts, Screenshot */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick 1-Click Indicator Toggles */}
          <div className="flex items-center gap-1">
            {["VOL", "EMA", "RSI", "MACD"].map((indName) => {
              const isIndActive = activeNames.has(indName);
              return (
                <button
                  key={indName}
                  type="button"
                  onClick={() => {
                    if (removed.includes(indName)) update({ removed: removed.filter((x) => x !== indName) });
                    else if (activeNames.has(indName)) removeIndicator(indName);
                    else update({ extras: [...extras, indName] });
                  }}
                  className={`rounded-md border px-2 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                    isIndActive
                      ? "border-primary/60 bg-primary/20 text-primary shadow-2xs"
                      : "border-border/70 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  title={`Toggle ${indName} on/off`}
                >
                  {indName}
                </button>
              );
            })}
          </div>

          <IndicatorMenu
            active={activeNames}
            onToggle={(name) => {
              if (removed.includes(name)) update({ removed: removed.filter((x) => x !== name) });
              else if (activeNames.has(name)) removeIndicator(name);
              else update({ extras: [...extras, name] });
            }}
          />

          <div ref={panelRef} className="flex items-center gap-1.5">
            <div className="relative">
              <button
                type="button"
                aria-expanded={panel === "indicators"}
                className={`rounded-lg border px-2 py-1 text-xs font-medium cursor-pointer transition-colors ${
                  panel === "indicators"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background hover:bg-muted text-foreground"
                }`}
                onClick={() => setPanel(panel === "indicators" ? null : "indicators")}
              >
                Settings
              </button>
              {panel === "indicators" && chart.current && (
                <div className="absolute left-0 top-full z-50 mt-1.5 shadow-2xl">
                  <IndicatorSettings
                    chart={chart.current}
                    params={settings.params}
                    onParams={(name, p: IndicatorParams) => update({ params: { ...settings.params, [name]: p } })}
                    onRemove={removeIndicator}
                  />
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                aria-expanded={panel === "layouts"}
                className={`rounded-lg border px-2 py-1 text-xs font-medium cursor-pointer transition-colors ${
                  panel === "layouts"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background hover:bg-muted text-foreground"
                }`}
                onClick={() => setPanel(panel === "layouts" ? null : "layouts")}
              >
                Layouts
              </button>
              {panel === "layouts" && (
                <div className="absolute left-0 top-full z-50 mt-1.5 shadow-2xl">
                  <LayoutMenu
                    layouts={layouts}
                    onSave={(name) => setLayouts(saveLayout(name, settings))}
                    onLoad={(s) => update(s)}
                    onDelete={(name) => setLayouts(deleteLayout(name))}
                  />
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            title="Download Screenshot (PNG)"
            aria-label="Download Screenshot"
            className="rounded-lg border border-border bg-background p-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
            onClick={() => {
              const url = chart.current?.getConvertPictureUrl(true, "png", dark() ? "#0b0b0f" : "#fff");
              if (!url) return;
              const a = document.createElement("a");
              a.href = url;
              a.download = `${symbol || "chart"}.png`;
              a.click();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
        </div>

        {/* Right section: headerTrailing from ChartView */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {headerTrailing}
        </div>
      </div>

      {/* Main Chart Canvas + Left Drawing Rail */}
      <div className="relative flex min-h-0 flex-1">
        {/* Floating Active Drawing Mode Banner */}
        {active && (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border border-primary/40 bg-card/95 px-3 py-1 shadow-lg backdrop-blur-xs text-xs">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="font-semibold text-foreground">
              Drawing: {TOOL_NAMES[active] || active}
            </span>
            {continuous && (
              <span className="rounded bg-teal-500/20 px-1.5 py-0.5 text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                Continuous
              </span>
            )}
            <button
              type="button"
              onClick={cancelActiveDrawing}
              className="ml-1 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
              title="Cancel drawing tool (Esc)"
              aria-label="Cancel drawing tool"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {sel && sel.currentStep === -1 && (
          <div className="absolute right-16 top-2 z-10 max-w-[calc(100%-9rem)]">
            <PropertiesPanel
              key={sel.id}
              overlay={sel}
              allTimeframes={allIds.current.has(sel.id)}
              onStyle={(styles) => {
                chart.current?.overrideOverlay({ id: sel.id, styles } as never);
                persist(400);
                bump();
              }}
              onExtend={(level) => {
                const fam = extendOf(sel.name);
                const snap = snapshot(chart.current!, tfRef.current, allIds.current);
                const i = snap.findIndex((d) => d.id === sel.id);
                if (!fam || i < 0) return;
                commit(snap.map(stripId).map((d, j) => (j === i ? { ...d, name: fam.family[level] } : d)));
              }}
              onAllTimeframes={(on) => {
                if (on) allIds.current.add(sel.id);
                else allIds.current.delete(sel.id);
                persist();
              }}
              onDelete={() => chart.current?.removeOverlay({ id: sel.id })}
            />
          </div>
        )}

        <DrawingToolbar
          active={active}
          magnet={magnet}
          locked={locked}
          hidden={hidden}
          continuous={continuous}
          canUndo={history.current.canUndo}
          canRedo={history.current.canRedo}
          onPick={(name) => {
            if (!name) {
              cancelActiveDrawing();
              return;
            }
            setActive(name);
            const id = draw({ name });
            activeOverlayIdRef.current = typeof id === "string" ? id : null;
          }}
          onContinuous={() => setContinuous((c) => !c)}
          onMagnet={() => {
            const next = MAGNETS[(MAGNETS.indexOf(magnet) + 1) % MAGNETS.length];
            magnetRef.current = next;
            setMagnet(next);
            apply({ mode: next });
          }}
          onLock={() => {
            setLocked(!locked);
            apply({ lock: !locked });
            persist();
          }}
          onHide={() => {
            setHidden(!hidden);
            apply({ visible: hidden });
          }}
          onUndo={() => step("undo")}
          onRedo={() => step("redo")}
          onClear={() => mine().forEach((o) => chart.current?.removeOverlay({ id: o.id }))}
        />

        <div ref={el} className="h-full min-w-0 flex-1" />
      </div>
    </div>
  );
}

function dark() {
  return document.documentElement.classList.contains("dark");
}
