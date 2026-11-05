"use client";

import type { OverlayMode } from "klinecharts";
import { useEffect, useMemo, useRef, useState } from "react";
import { getAllIndicators } from "../klines/indicators";
import { deleteUserCustomIndicator } from "../klines/indicators/userCustom";
import { DRAWING_GROUPS } from "../klines/overlays";
import { CreateIndicatorModal } from "./CreateIndicatorModal";

export const CHART_TYPES = [
  { value: "candle_solid", label: "Candles" },
  { value: "candle_stroke", label: "Hollow" },
  { value: "candle_up_stroke", label: "Hollow up" },
  { value: "ohlc", label: "OHLC bars" },
  { value: "area", label: "Area" },
] as const;

export const TOOL_NAMES: Record<string, string> = {
  segment: "Trend Line",
  arrow: "Arrow",
  rayLine: "Ray",
  straightLine: "Extended Line",
  horizontalStraightLine: "Horizontal Line",
  horizontalRayLine: "Horizontal Ray",
  horizontalSegment: "Horizontal Segment",
  verticalStraightLine: "Vertical Line",
  verticalSegment: "Vertical Segment",
  priceLine: "Price Line",
  fibonacciLine: "Fib Retracement",
  fibExtension: "Fib Extension",
  fibChannel: "Fib Channel",
  fibTimeZones: "Fib Time Zones",
  gannFan: "Gann Fan",
  pitchfork: "Pitchfork",
  parallelStraightLine: "Parallel Channel",
  priceChannelLine: "Price Channel",
  rect: "Rectangle / Zone",
  circle: "Circle",
  polygon: "Polygon",
  arc: "Arc",
  brush: "Freehand Brush",
  text: "Text Note",
  simpleAnnotation: "Annotation",
  simpleTag: "Price Tag",
  elliottWave: "Elliott Wave (1-2-3-4-5)",
  harmonic: "XABCD Harmonic Pattern",
  position: "Long / Short Position",
  measure: "Measure (Bars & Price)",
};

interface ToolCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  defaultTool: string;
  tools: { name: string; label: string; hint?: string }[];
}

export function DrawingToolbar({
  active,
  magnet,
  locked,
  hidden,
  continuous,
  canUndo,
  canRedo,
  onPick,
  onMagnet,
  onLock,
  onHide,
  onContinuous,
  onUndo,
  onRedo,
  onClear,
}: {
  active: string | null;
  magnet: OverlayMode;
  locked: boolean;
  hidden: boolean;
  continuous: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onPick: (name: string) => void;
  onMagnet: () => void;
  onLock: () => void;
  onHide: () => void;
  onContinuous: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Remember the selected tool for each category (defaulting to the primary tool)
  const [selectedTools, setSelectedTools] = useState<Record<string, string>>({
    lines: "segment",
    fib: "fibonacciLine",
    shapes: "rect",
    patterns: "elliottWave",
    measure: "position",
  });

  // Close flyout on outside click
  useEffect(() => {
    if (!openCategory) return;
    const handleDown = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenCategory(null);
      }
    };
    window.addEventListener("mousedown", handleDown);
    return () => window.removeEventListener("mousedown", handleDown);
  }, [openCategory]);

  // Comprehensive 5 Tool Categories from DRAWING_GROUPS
  const categories: ToolCategory[] = useMemo(() => {
    const findTools = (groupLabel: string) => {
      const g = DRAWING_GROUPS.find((group) => group.label === groupLabel);
      return (
        g?.tools.map((t) => ({
          name: t.name,
          label: TOOL_NAMES[t.name] || t.label,
        })) || []
      );
    };

    return [
      {
        id: "lines",
        label: "Trend & Lines",
        defaultTool: "segment",
        icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="20" x2="20" y2="4" />
            <circle cx="4" cy="20" r="2" fill="currentColor" />
            <circle cx="20" cy="4" r="2" fill="currentColor" />
          </svg>
        ),
        tools: findTools("Lines"),
      },
      {
        id: "fib",
        label: "Fibonacci & Channels",
        defaultTool: "fibonacciLine",
        icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="5" x2="21" y2="5" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <line x1="3" y1="15" x2="21" y2="15" />
            <line x1="3" y1="19" x2="21" y2="19" />
          </svg>
        ),
        tools: findTools("Channels & Fib"),
      },
      {
        id: "shapes",
        label: "Shapes & Freehand",
        defaultTool: "rect",
        icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect width="14" height="10" x="5" y="4" rx="2" />
            <path d="M4 20h16" />
          </svg>
        ),
        tools: findTools("Shapes & notes"),
      },
      {
        id: "patterns",
        label: "Harmonic & Waves",
        defaultTool: "elliottWave",
        icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m2 16 5-10 5 8 5-10 5 12" />
          </svg>
        ),
        tools: findTools("Patterns"),
      },
      {
        id: "measure",
        label: "Prediction & Measure",
        defaultTool: "position",
        icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="4" />
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
          </svg>
        ),
        tools: findTools("Measure & position"),
      },
    ];
  }, []);

  if (collapsed) {
    return (
      <div className="shrink-0 flex flex-col justify-start p-1 relative z-20">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Show Drawing Tools"
          aria-label="Show Drawing Tools"
          className="rounded-lg border border-border bg-card p-1 text-muted-foreground hover:bg-muted hover:text-foreground shadow-xs cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    );
  }

  const iconBtn =
    "relative grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground cursor-pointer select-none";
  const activeBtn = "bg-primary text-primary-foreground font-bold shadow-xs ring-2 ring-primary/40";

  const handlePickTool = (categoryId: string, toolName: string) => {
    setSelectedTools((prev) => ({ ...prev, [categoryId]: toolName }));
    onPick(toolName);
    setOpenCategory(null);
  };

  return (
    <div
      ref={toolbarRef}
      className="relative z-20 shrink-0 flex flex-col items-center gap-1 border-r border-border/80 bg-card/95 py-2 px-1 select-none"
      aria-label="Drawing tools"
    >
      {/* 1. Cursor / Selection tool */}
      <button
        type="button"
        title="Cursor / Select (Cancel Drawing Mode)"
        onClick={() => {
          onPick("");
          setOpenCategory(null);
        }}
        className={`${iconBtn} ${!active ? activeBtn : ""}`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          <path d="m13 13 6 6" />
        </svg>
      </button>

      {/* 2. Tool Categories with Rich Flyouts */}
      {categories.map((cat) => {
        const hasActiveTool = cat.tools.some((t) => t.name === active);
        const isOpen = openCategory === cat.id;
        const currentTool = selectedTools[cat.id] || cat.defaultTool;

        return (
          <div key={cat.id} className="relative">
            <div className="flex items-center">
              <button
                type="button"
                title={`${cat.label} (Click tool to draw, click arrow to select from ${cat.tools.length} tools)`}
                aria-pressed={hasActiveTool}
                onClick={() => {
                  if (active === currentTool) {
                    setOpenCategory(isOpen ? null : cat.id);
                  } else {
                    onPick(currentTool);
                  }
                }}
                className={`${iconBtn} ${hasActiveTool ? activeBtn : ""}`}
              >
                {cat.icon}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenCategory(isOpen ? null : cat.id);
                  }}
                  className="absolute bottom-0 right-0 p-0.5 text-[8px] opacity-70 hover:opacity-100"
                >
                  ▸
                </span>
              </button>
            </div>

            {/* Flyout Popover containing ALL tools in this category */}
            {isOpen && (
              <div className="absolute left-full top-0 ml-1.5 z-50 w-60 rounded-xl border border-border bg-card p-2 shadow-2xl animate-in fade-in duration-150">
                <div className="mb-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 flex items-center justify-between">
                  <span>{cat.label}</span>
                  <span className="font-mono text-primary">{cat.tools.length} Tools</span>
                </div>
                <div className="space-y-0.5 max-h-80 overflow-y-auto [scrollbar-width:thin]">
                  {cat.tools.map((t) => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => handlePickTool(cat.id, t.name)}
                      className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                        active === t.name
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <span>{t.label}</span>
                      {active === t.name && <span className="font-bold">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="my-1 h-px w-6 bg-border/80" />

      {/* 3. Magnet Mode Toggle */}
      <button
        type="button"
        title={`Magnet Snapping: ${magnet === "normal" ? "Off" : magnet === "weak_magnet" ? "Weak Magnet" : "Strong Magnet"}`}
        aria-pressed={magnet !== "normal"}
        onClick={onMagnet}
        className={`${iconBtn} ${magnet !== "normal" ? "bg-primary/20 text-primary border border-primary/40" : ""}`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m6 15-3-3 6.7-6.7a3.5 3.5 0 0 1 4.95 0L17 7.7a3.5 3.5 0 0 1 0 4.95L10.3 19.3l-3-3" />
          <path d="m9 9 4 4" />
        </svg>
      </button>

      {/* 4. Stay in Drawing Mode (Continuous) Toggle */}
      <button
        type="button"
        title={continuous ? "Continuous Drawing: ON (Keep tool active after drawing)" : "Continuous Drawing: OFF"}
        aria-pressed={continuous}
        onClick={onContinuous}
        className={`${iconBtn} ${continuous ? "bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/40" : ""}`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
      </button>

      {/* 5. Lock Drawings Toggle */}
      <button
        type="button"
        title={locked ? "Unlock Drawings" : "Lock All Drawings"}
        aria-pressed={locked}
        onClick={onLock}
        className={`${iconBtn} ${locked ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40" : ""}`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect width="16" height="11" x="4" y="11" rx="2" ry="2" />
          <path d={locked ? "M7 11V7a5 5 0 0 1 10 0v4" : "M7 11V7a5 5 0 0 1 9.9-1"} />
        </svg>
      </button>

      {/* 6. Hide Drawings Toggle */}
      <button
        type="button"
        title={hidden ? "Show Drawings" : "Hide Drawings"}
        aria-pressed={hidden}
        onClick={onHide}
        className={`${iconBtn} ${hidden ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40" : ""}`}
      >
        {hidden ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m2 2 20 20" />
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>

      <div className="my-1 h-px w-6 bg-border/80" />

      {/* 7. Undo */}
      <button
        type="button"
        title="Undo (Ctrl+Z)"
        disabled={!canUndo}
        onClick={onUndo}
        className={`${iconBtn} disabled:opacity-30`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 14 4 9 9 4" />
          <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
        </svg>
      </button>

      {/* 8. Redo */}
      <button
        type="button"
        title="Redo (Ctrl+Y)"
        disabled={!canRedo}
        onClick={onRedo}
        className={`${iconBtn} disabled:opacity-30`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 14 20 9 15 4" />
          <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
        </svg>
      </button>

      {/* 9. Clear all */}
      <button
        type="button"
        title="Remove All Drawings"
        onClick={onClear}
        className={`${iconBtn} hover:text-red-500 hover:bg-red-500/10`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      </button>

      {/* 10. Collapse rail */}
      <div className="mt-auto pt-1">
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title="Collapse Tools"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function IndicatorMenu({
  active,
  onToggle,
}: {
  active: Set<string>;
  onToggle: (name: string, main: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [q, setQ] = useState("");
  const [filterPane, setFilterPane] = useState<"all" | "price" | "sub" | "custom">("all");
  const [version, setVersion] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handleDown);
    return () => window.removeEventListener("mousedown", handleDown);
  }, [open]);

  useEffect(() => {
    const handleUpdate = () => setVersion((v) => v + 1);
    window.addEventListener("nepse:user_indicators_changed", handleUpdate);
    return () => window.removeEventListener("nepse:user_indicators_changed", handleUpdate);
  }, []);

  const allIndicators = useMemo(() => {
    void version;
    return getAllIndicators();
  }, [version]);

  const query = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    return allIndicators.filter((i) => {
      const matchesQuery =
        !query ||
        i.name.toLowerCase().includes(query) ||
        i.label.toLowerCase().includes(query);
      if (!matchesQuery) return false;
      if (filterPane === "price") return i.main;
      if (filterPane === "sub") return !i.main;
      if (filterPane === "custom") return i.isCustom;
      return true;
    });
  }, [allIndicators, query, filterPane]);

  const priceIndicators = filtered.filter((i) => i.main);
  const paneIndicators = filtered.filter((i) => !i.main);

  const handleDeleteCustom = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    deleteUserCustomIndicator(name);
    setVersion((v) => v + 1);
  };

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold hover:bg-muted cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
          <span>All Indicators</span>
          {active.size > 0 && (
            <span className="rounded-full bg-primary/20 text-primary font-bold px-1.5 py-0.2 text-[10px]">
              {active.size}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-1.5 w-88 rounded-xl border border-border bg-card p-3 shadow-2xl animate-in fade-in duration-150">
            {/* Header with Search and Create button */}
            <div className="mb-2.5 flex items-center gap-1.5">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search indicator (e.g. RSI, EMA, MACD)…"
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setModalOpen(true);
                }}
                title="Create a custom indicator directly"
                className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-bold text-primary-foreground hover:opacity-90 cursor-pointer"
              >
                + Create
              </button>
            </div>

            {/* Currently Active Indicators Chips */}
            {active.size > 0 && (
              <div className="mb-2.5 rounded-lg border border-border/70 bg-muted/20 p-2 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Active Indicators ({active.size}):
                </span>
                <div className="flex flex-wrap gap-1">
                  {Array.from(active).map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary"
                    >
                      <span>{name}</span>
                      <button
                        type="button"
                        onClick={() => onToggle(name, true)}
                        className="hover:text-red-500 cursor-pointer"
                        title={`Remove ${name}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Filter pills */}
            <div className="mb-2 flex gap-1 border-b border-border/60 pb-2 text-[10px]">
              {(
                [
                  ["all", "All"],
                  ["price", "On Price"],
                  ["sub", "Oscillators"],
                  ["custom", "Custom"],
                ] as const
              ).map(([key, title]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilterPane(key)}
                  className={`rounded-md px-2 py-0.5 font-semibold transition-colors cursor-pointer ${
                    filterPane === key
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {title}
                </button>
              ))}
            </div>

            {/* Indicators List */}
            <div className="max-h-80 overflow-y-auto pr-1 space-y-2 [scrollbar-width:thin]">
              {filtered.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  <p>No indicators match &quot;{q}&quot;</p>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setModalOpen(true);
                    }}
                    className="mt-2 text-primary underline font-medium"
                  >
                    Create it as a custom indicator
                  </button>
                </div>
              ) : (
                <>
                  {priceIndicators.length > 0 && filterPane !== "sub" && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        On Price (Overlay) — {priceIndicators.length}
                      </span>
                      <div className="mt-1 space-y-1">
                        {priceIndicators.map((ind) => {
                          const isActive = active.has(ind.name);
                          return (
                            <div
                              key={ind.name}
                              onClick={() => onToggle(ind.name, ind.main)}
                              className={`flex cursor-pointer items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs transition-colors hover:border-primary/50 ${
                                isActive ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted/40"
                              }`}
                            >
                              <div className="flex min-w-0 flex-col">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-xs font-bold">
                                    {ind.name}
                                  </span>
                                  {ind.isCustom && (
                                    <span className="rounded bg-purple-500/15 px-1 text-[9px] font-medium text-purple-600 dark:text-purple-400">
                                      Custom
                                    </span>
                                  )}
                                </div>
                                <span className="truncate text-[11px] text-muted-foreground" title={ind.label}>
                                  {ind.label}
                                </span>
                              </div>
                              <div className="ml-2 flex shrink-0 items-center gap-1">
                                {ind.isCustom && (
                                  <button
                                    type="button"
                                    title="Delete custom indicator"
                                    onClick={(e) => handleDeleteCustom(e, ind.name)}
                                    className="rounded p-0.5 text-muted-foreground hover:bg-red-500/20 hover:text-red-500"
                                  >
                                    ✕
                                  </button>
                                )}
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                    isActive
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {isActive ? "Active ✓" : "+ Add"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {paneIndicators.length > 0 && filterPane !== "price" && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Oscillators & Panes — {paneIndicators.length}
                      </span>
                      <div className="mt-1 space-y-1">
                        {paneIndicators.map((ind) => {
                          const isActive = active.has(ind.name);
                          return (
                            <div
                              key={ind.name}
                              onClick={() => onToggle(ind.name, ind.main)}
                              className={`flex cursor-pointer items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs transition-colors hover:border-primary/50 ${
                                isActive ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted/40"
                              }`}
                            >
                              <div className="flex min-w-0 flex-col">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-xs font-bold">
                                    {ind.name}
                                  </span>
                                  {ind.isCustom && (
                                    <span className="rounded bg-purple-500/15 px-1 text-[9px] font-medium text-purple-600 dark:text-purple-400">
                                      Custom
                                    </span>
                                  )}
                                </div>
                                <span className="truncate text-[11px] text-muted-foreground" title={ind.label}>
                                  {ind.label}
                                </span>
                              </div>
                              <div className="ml-2 flex shrink-0 items-center gap-1">
                                {ind.isCustom && (
                                  <button
                                    type="button"
                                    title="Delete custom indicator"
                                    onClick={(e) => handleDeleteCustom(e, ind.name)}
                                    className="rounded p-0.5 text-muted-foreground hover:bg-red-500/20 hover:text-red-500"
                                  >
                                    ✕
                                  </button>
                                )}
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                    isActive
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {isActive ? "Active ✓" : "+ Add"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Bottom toolbar */}
            <div className="mt-2.5 border-t border-border/60 pt-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setModalOpen(true);
                }}
                className="w-full rounded-lg border border-dashed border-primary/50 py-1.5 text-center text-xs font-bold text-primary hover:bg-primary/10 cursor-pointer transition-colors"
              >
                + Create Indicator Directly
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateIndicatorModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(name, main) => {
          setVersion((v) => v + 1);
          onToggle(name, main);
        }}
      />
    </>
  );
}
