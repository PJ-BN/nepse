"use client";

import type { Chart, IndicatorCreate, KLineData, OverlayCreate, OverlayMode } from "klinecharts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ALL_TF, extendOf, stripId, loadDrawings, saveDrawings, snapshot, type Drawing } from "../drawings";
import { applyParams, DEFAULT_SETTINGS, deleteLayout, loadLayouts, loadSettings, saveLayout, saveSettings, type ChartSettings, type IndicatorParams } from "../settings";
import { History } from "../undo";
import { DEFAULT_INDICATORS, type Candle, type Indicator, type PriceOverlay } from "../types";
import { isMainIndicator, registerIndicators } from "../klines/indicators";
import { registerOverlays } from "../klines/overlays";
import { CHART_TYPES, DrawingToolbar, IndicatorMenu } from "./ChartTools";
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
const KIND = { sma: ["MA", true], ema: ["EMA", true], bb: ["BOLL", true], rsi: ["RSI", false], macd: ["MACD", false] } as const;

function fromList(list: Indicator[]): IndicatorCreate[] {
  const out: IndicatorCreate[] = [];
  for (const type of Object.keys(KIND) as (keyof typeof KIND)[]) {
    let items = list.filter((i) => i.type === type);
    if (!items.length) continue;
    const [name, main] = KIND[type];
    if (type === "bb" || type === "macd") items = items.slice(0, 1); // one of each is meaningful
    const ind: IndicatorCreate = { name };
    if (type === "bb") ind.calcParams = [items[0].period, 2];
    else if (type !== "macd") ind.calcParams = items.map((i) => i.period);
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
  const [magnet, setMagnet] = useState<OverlayMode>("normal");
  const [locked, setLocked] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [settings, setSettings] = useState<ChartSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef(DEFAULT_SETTINGS);
  const [layouts, setLayouts] = useState<Record<string, ChartSettings>>({});
  const [panel, setPanel] = useState<"indicators" | "layouts" | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
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

  const draw = useCallback(
    (o: Partial<OverlayCreate> & { name: string }) =>
      chart.current?.createOverlay({
        mode: magnetRef.current,
        onDrawEnd: () => {
          setActive(null);
          persist();
        },
        onPressedMoveEnd: () => persist(),
        onRemoved: (e) => {
          setSelected((s) => (s === e.overlay.id ? null : s));
          persist();
        },
        onSelected: (e) => setSelected(e.overlay.id),
        onDeselected: (e) => setSelected((s) => (s === e.overlay.id ? null : s)),
        onRightClick: (e) => {
          chart.current?.removeOverlay({ id: e.overlay.id });
        },
        ...o,
      }),
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
  }, [symbol, tf, render, ready]);

  // Saved settings (indicator params, chart type, scale) are read after mount so SSR markup matches.
  useEffect(() => {
    const s = loadSettings();
    settingsRef.current = s;
    setSettings(s);
    setLayouts(loadLayouts());
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
  const btn = "rounded border px-2 py-1 hover:bg-foreground/10";

  return (
    <div
      className="flex h-full flex-col gap-2 outline-none"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).closest("input, select, textarea")) return;
        const k = e.key.toLowerCase();
        if ((e.ctrlKey || e.metaKey) && k === "z") {
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
      <div className="flex flex-wrap items-start gap-2 text-xs">
        <IndicatorMenu
          active={activeNames}
          onToggle={(name) => {
            if (removed.includes(name)) update({ removed: removed.filter((x) => x !== name) });
            else if (activeNames.has(name)) removeIndicator(name);
            else update({ extras: [...extras, name] });
          }}
        />
        <div className="relative">
          <button type="button" aria-expanded={panel === "indicators"} className={btn} onClick={() => setPanel(panel === "indicators" ? null : "indicators")}>
            Indicator settings
          </button>
          {panel === "indicators" && chart.current && (
            <div className="absolute left-0 top-full z-20 mt-1">
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
          <button type="button" aria-expanded={panel === "layouts"} className={btn} onClick={() => setPanel(panel === "layouts" ? null : "layouts")}>
            Layouts
          </button>
          {panel === "layouts" && (
            <div className="absolute left-0 top-full z-20 mt-1">
              <LayoutMenu
                layouts={layouts}
                onSave={(name) => setLayouts(saveLayout(name, settings))}
                onLoad={(s) => update(s)}
                onDelete={(name) => setLayouts(deleteLayout(name))}
              />
            </div>
          )}
        </div>
        <select aria-label="Chart type" value={type} onChange={(e) => update({ type: e.target.value })} className="rounded border bg-background px-2 py-1">
          {CHART_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select aria-label="Price scale" value={axis} onChange={(e) => update({ axis: e.target.value })} className="rounded border bg-background px-2 py-1">
          {AXES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <button
          type="button"
          className={btn}
          onClick={() => {
            const url = chart.current?.getConvertPictureUrl(true, "png", dark() ? "#0b0b0f" : "#fff");
            if (!url) return;
            const a = document.createElement("a");
            a.href = url;
            a.download = `${symbol || "chart"}.png`;
            a.click();
          }}
        >
          Screenshot
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 gap-2">
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
          canUndo={history.current.canUndo}
          canRedo={history.current.canRedo}
          onPick={(name) => {
            setActive(name);
            draw({ name });
          }}
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
