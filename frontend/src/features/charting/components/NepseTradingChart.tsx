"use client";

import type { Chart, IndicatorCreate, KLineData, OverlayCreate, OverlayMode } from "klinecharts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadDrawings, saveDrawings } from "../drawings";
import { DEFAULT_INDICATORS, type Candle, type Indicator, type PriceOverlay } from "../types";
import { CHART_TYPES, DrawingToolbar, IndicatorMenu } from "./ChartTools";

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
}: {
  candles: Candle[];
  overlay?: PriceOverlay[];
  intraday?: boolean;
  indicators?: Indicator[];
  symbol?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<Chart | null>(null);
  const data = useRef<KLineData[]>([]);
  const symbolRef = useRef(symbol);
  const magnetRef = useRef<OverlayMode>("normal");
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [magnet, setMagnet] = useState<OverlayMode>("normal");
  const [locked, setLocked] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [extras, setExtras] = useState<string[]>([]);
  const [type, setType] = useState<string>("candle_solid");
  const [axis, setAxis] = useState<string>("normal");
  const derived = useMemo(() => fromList(indicators), [indicators]);

  // Deferred so removals/moves have settled before we snapshot the overlays.
  const persist = useCallback(() => {
    setTimeout(() => chart.current && saveDrawings(symbolRef.current, chart.current), 0);
  }, []);

  const draw = useCallback(
    (o: Partial<OverlayCreate> & { name: string }) =>
      chart.current?.createOverlay({
        mode: magnetRef.current,
        onDrawEnd: () => {
          setActive(null);
          persist();
        },
        onPressedMoveEnd: persist,
        onRemoved: persist,
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
    import("klinecharts").then(({ dispose, init }) => {
      if (dead) return;
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
      };
      setReady(true);
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

  // Rebuilt whenever the grid's indicator list or the menu's extras change.
  useEffect(() => {
    const c = chart.current;
    if (!c) return;
    c.removeIndicator();
    c.createIndicator("VOL", false);
    derived.forEach((i) => c.createIndicator(i, i.paneId === MAIN));
    extras.forEach((name) => {
      if (!derived.some((d) => d.name === name)) c.createIndicator(MAIN_NAMES.includes(name) ? { name, paneId: MAIN } : name, MAIN_NAMES.includes(name));
    });
  }, [derived, extras, ready]);

  // Swap in the saved drawings for the new symbol.
  useEffect(() => {
    const c = chart.current;
    symbolRef.current = symbol;
    if (!c) return;
    c.removeOverlay();
    loadDrawings(symbol).forEach((d) => draw(d as never));
  }, [symbol, draw, ready]);

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
  const activeNames = new Set([...derived.map((d) => d.name), ...extras]);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <IndicatorMenu
          active={activeNames}
          onToggle={(name) => {
            if (derived.some((d) => d.name === name)) return; // owned by the grid's indicator list
            setExtras((e) => (e.includes(name) ? e.filter((x) => x !== name) : [...e, name]));
          }}
        />
        <select
          aria-label="Chart type"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            chart.current?.setStyles({ candle: { type: e.target.value as never } });
          }}
          className="rounded border bg-background px-2 py-1"
        >
          {CHART_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select
          aria-label="Price scale"
          value={axis}
          onChange={(e) => {
            setAxis(e.target.value);
            chart.current?.overrideYAxis({ name: e.target.value, paneId: MAIN });
          }}
          className="rounded border bg-background px-2 py-1"
        >
          {AXES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <button
          type="button"
          className="rounded border px-2 py-1 hover:bg-hover"
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
      <div className="flex min-h-0 flex-1 gap-2">
        <DrawingToolbar
          active={active}
          magnet={magnet}
          locked={locked}
          hidden={hidden}
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
          onUndo={() => {
            const last = mine().at(-1);
            if (last) chart.current?.removeOverlay({ id: last.id });
          }}
          onClear={() => mine().forEach((o) => chart.current?.removeOverlay({ id: o.id }))}
        />
        <div ref={el} className="h-full min-w-0 flex-1" />
      </div>
    </div>
  );
}

const MAIN_NAMES = ["MA", "EMA", "SMA", "BOLL", "SAR", "BBI"];

function dark() {
  return document.documentElement.classList.contains("dark");
}
