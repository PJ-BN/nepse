"use client";

import type { OverlayMode } from "klinecharts";
import { useEffect, useMemo, useState } from "react";
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

const btn = "rounded border px-2 py-1 text-xs hover:bg-foreground/10";
const on = "border-blue-500 bg-blue-500/20";

export function DrawingToolbar({
  active,
  magnet,
  locked,
  hidden,
  canUndo,
  canRedo,
  onPick,
  onMagnet,
  onLock,
  onHide,
  onUndo,
  onRedo,
  onClear,
}: {
  active: string | null;
  magnet: OverlayMode;
  locked: boolean;
  hidden: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onPick: (name: string) => void;
  onMagnet: () => void;
  onLock: () => void;
  onHide: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Close flyout on outside click or escape
  useEffect(() => {
    if (!openGroup) return;
    const handleDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".drawing-popover")) {
        setOpenGroup(null);
      }
    };
    window.addEventListener("mousedown", handleDown);
    return () => window.removeEventListener("mousedown", handleDown);
  }, [openGroup]);

  if (collapsed) {
    return (
      <div className="shrink-0 flex flex-col justify-start p-1 z-20">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Show Drawing Tools"
          aria-label="Show Drawing Tools"
          className="rounded border border-border bg-card p-1 text-muted-foreground hover:bg-muted hover:text-foreground shadow-xs cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    );
  }

  const iconBtn =
    "relative grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer";
  const activeBtn = "bg-primary/15 text-primary border border-primary/30";

  return (
    <div
      className="drawing-popover shrink-0 flex flex-col items-center gap-1 border-r border-border/70 bg-card/95 py-2 px-1 z-20 select-none overflow-y-auto [scrollbar-width:none]"
      aria-label="Drawing tools"
    >
      {/* 1. Cursor / Selection tool */}
      <button
        type="button"
        title="Cursor / Select"
        onClick={() => {
          onPick("");
          setOpenGroup(null);
        }}
        className={`${iconBtn} ${!active ? activeBtn : ""}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          <path d="m13 13 6 6" />
        </svg>
      </button>

      {/* 2. Tool Groups with popover flyouts */}
      {DRAWING_GROUPS.map((g, gIdx) => {
        const hasActiveTool = g.tools.some((t) => t.name === active);
        const isOpen = openGroup === g.label;

        // Group icons
        const groupIcon =
          gIdx === 0 ? (
            /* Line tools icon */
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="19" x2="19" y2="5" />
              <circle cx="5" cy="19" r="2" fill="currentColor" />
              <circle cx="19" cy="5" r="2" fill="currentColor" />
            </svg>
          ) : gIdx === 1 ? (
            /* Fib & Channel icon */
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
              <line x1="12" y1="3" x2="12" y2="21" strokeDasharray="2 2" />
            </svg>
          ) : (
            /* Shapes & Notes icon */
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="14" height="14" x="5" y="5" rx="2" />
            </svg>
          );

        return (
          <div key={g.label} className="relative">
            <button
              type="button"
              title={g.label}
              onClick={() => setOpenGroup(isOpen ? null : g.label)}
              className={`${iconBtn} ${hasActiveTool ? activeBtn : ""}`}
            >
              {groupIcon}
              <span className="absolute bottom-0.5 right-0.5 text-[8px] opacity-70">▸</span>
            </button>

            {/* Flyout Popover */}
            {isOpen && (
              <div className="absolute left-full top-0 ml-2 z-50 w-52 rounded-xl border border-border bg-card p-2 shadow-2xl animate-in fade-in duration-150">
                <div className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {g.label}
                </div>
                <div className="space-y-0.5 max-h-72 overflow-y-auto [scrollbar-width:thin]">
                  {g.tools.map((t) => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => {
                        onPick(t.name);
                        setOpenGroup(null);
                      }}
                      className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                        active === t.name
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <span>{t.label}</span>
                      {active === t.name && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="my-1.5 h-px w-6 bg-border/80" />

      {/* 3. Magnet Mode Toggle */}
      <button
        type="button"
        title={`Magnet: ${magnet === "normal" ? "Off" : magnet === "weak_magnet" ? "Weak" : "Strong"}`}
        aria-pressed={magnet !== "normal"}
        onClick={onMagnet}
        className={`${iconBtn} ${magnet !== "normal" ? activeBtn : ""}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m6 15-3-3 6.7-6.7a3.5 3.5 0 0 1 4.95 0L17 7.7a3.5 3.5 0 0 1 0 4.95L10.3 19.3l-3-3" />
          <path d="m9 9 4 4" />
        </svg>
      </button>

      {/* 4. Lock Drawings Toggle */}
      <button
        type="button"
        title={locked ? "Unlock Drawings" : "Lock All Drawings"}
        aria-pressed={locked}
        onClick={onLock}
        className={`${iconBtn} ${locked ? activeBtn : ""}`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d={locked ? "M7 11V7a5 5 0 0 1 10 0v4" : "M7 11V7a5 5 0 0 1 9.9-1"} />
        </svg>
      </button>

      {/* 5. Hide Drawings Toggle */}
      <button
        type="button"
        title={hidden ? "Show Drawings" : "Hide Drawings"}
        aria-pressed={hidden}
        onClick={onHide}
        className={`${iconBtn} ${hidden ? activeBtn : ""}`}
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

      <div className="my-1.5 h-px w-6 bg-border/80" />

      {/* 6. Undo */}
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

      {/* 7. Redo */}
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

      {/* 8. Clear all */}
      <button
        type="button"
        title="Remove All Drawings"
        onClick={onClear}
        className={`${iconBtn} hover:text-red-500`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      </button>

      {/* 9. Collapse rail */}
      <div className="mt-auto pt-2">
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

  useEffect(() => {
    const handleUpdate = () => setVersion((v) => v + 1);
    window.addEventListener("nepse:user_indicators_changed", handleUpdate);
    return () => window.removeEventListener("nepse:user_indicators_changed", handleUpdate);
  }, []);

  const allIndicators = useMemo(() => {
    // version is a dependency to recompute when custom indicators are added/removed
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
      <div className="relative">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={`${btn} flex items-center gap-1 font-medium`}
        >
          <span>Indicators</span>
          <span className="rounded-full bg-blue-500/20 px-1.5 py-0.2 text-[10px] text-blue-600 dark:text-blue-400">
            {active.size}
          </span>
        </button>

        {open && (
          <div className="absolute left-0 top-full z-30 mt-1 w-80 rounded-lg border bg-background p-2.5 shadow-xl">
            {/* Header with Search and Create button */}
            <div className="mb-2 flex items-center gap-1.5">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search symbol or name (e.g. RSI, Hull)…"
                className="w-full rounded border bg-background px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setModalOpen(true);
                }}
                title="Create a custom indicator directly"
                className="shrink-0 rounded bg-blue-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-blue-700"
              >
                + Create
              </button>
            </div>

            {/* Filter pills */}
            <div className="mb-2 flex gap-1 border-b pb-2 text-[10px]">
              {(
                [
                  ["all", "All"],
                  ["price", "On Price"],
                  ["sub", "Separate Pane"],
                  ["custom", "Custom"],
                ] as const
              ).map(([key, title]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilterPane(key)}
                  className={`rounded px-1.5 py-0.5 font-medium transition-colors ${
                    filterPane === key
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                  }`}
                >
                  {title}
                </button>
              ))}
            </div>

            {/* Indicators List */}
            <div className="max-h-80 overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  <p>No indicators match &quot;{q}&quot;</p>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setModalOpen(true);
                    }}
                    className="mt-2 text-blue-600 underline dark:text-blue-400"
                  >
                    Create it as a custom indicator
                  </button>
                </div>
              ) : (
                <>
                  {priceIndicators.length > 0 && filterPane !== "sub" && (
                    <div className="mb-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        On Price (Overlay) — {priceIndicators.length}
                      </span>
                      <div className="mt-1 space-y-1">
                        {priceIndicators.map((ind) => {
                          const isActive = active.has(ind.name);
                          return (
                            <div
                              key={ind.name}
                              onClick={() => onToggle(ind.name, ind.main)}
                              className={`flex cursor-pointer items-center justify-between rounded border px-2 py-1.5 text-xs transition-colors hover:border-blue-400 ${
                                isActive ? on : "bg-card hover:bg-muted/30"
                              }`}
                            >
                              <div className="flex min-w-0 flex-col">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
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
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                    isActive ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {isActive ? "Active" : "Add"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {paneIndicators.length > 0 && filterPane !== "price" && (
                    <div className="mb-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Separate Pane (Oscillator) — {paneIndicators.length}
                      </span>
                      <div className="mt-1 space-y-1">
                        {paneIndicators.map((ind) => {
                          const isActive = active.has(ind.name);
                          return (
                            <div
                              key={ind.name}
                              onClick={() => onToggle(ind.name, ind.main)}
                              className={`flex cursor-pointer items-center justify-between rounded border px-2 py-1.5 text-xs transition-colors hover:border-blue-400 ${
                                isActive ? on : "bg-card hover:bg-muted/30"
                              }`}
                            >
                              <div className="flex min-w-0 flex-col">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
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
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                    isActive ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {isActive ? "Active" : "Add"}
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
            <div className="mt-2 border-t pt-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setModalOpen(true);
                }}
                className="w-full rounded border border-dashed border-blue-500/60 py-1.5 text-center text-xs font-medium text-blue-600 hover:bg-blue-500/10 dark:text-blue-400"
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
