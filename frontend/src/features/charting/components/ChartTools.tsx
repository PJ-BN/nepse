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
  return (
    <div className="flex w-28 shrink-0 flex-col gap-2 overflow-y-auto text-xs" aria-label="Drawing tools">
      {DRAWING_GROUPS.map((g) => (
        <div key={g.label} className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-gray-500">{g.label}</span>
          {g.tools.map((t) => (
            <button
              key={t.name}
              type="button"
              aria-pressed={active === t.name}
              onClick={() => onPick(t.name)}
              className={`${btn} text-left ${active === t.name ? on : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      ))}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wide text-gray-500">Controls</span>
        <button
          type="button"
          aria-pressed={magnet !== "normal"}
          onClick={onMagnet}
          className={`${btn} text-left ${magnet !== "normal" ? on : ""}`}
        >
          Magnet: {magnet === "normal" ? "off" : magnet === "weak_magnet" ? "weak" : "strong"}
        </button>
        <button
          type="button"
          aria-pressed={locked}
          onClick={onLock}
          className={`${btn} text-left ${locked ? on : ""}`}
        >
          Lock drawings
        </button>
        <button
          type="button"
          aria-pressed={hidden}
          onClick={onHide}
          className={`${btn} text-left ${hidden ? on : ""}`}
        >
          Hide drawings
        </button>
        <button
          type="button"
          disabled={!canUndo}
          onClick={onUndo}
          title="Ctrl+Z"
          className={`${btn} text-left disabled:opacity-40`}
        >
          Undo
        </button>
        <button
          type="button"
          disabled={!canRedo}
          onClick={onRedo}
          title="Ctrl+Shift+Z"
          className={`${btn} text-left disabled:opacity-40`}
        >
          Redo
        </button>
        <button type="button" onClick={onClear} className={`${btn} text-left`}>
          Clear all
        </button>
        <span className="text-[10px] text-gray-500">Click a drawing to edit it; right-click to delete.</span>
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
