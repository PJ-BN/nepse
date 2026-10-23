"use client";

import React, { useEffect, useState } from "react";

export interface PageLockOverlayProps {
  isActive: boolean;
  title?: string;
  subtitle?: string;
  steps?: string[];
  currentStepIndex?: number;
  onForceDismiss?: () => void;
}

export function PageLockOverlay({
  isActive,
  title = "Processing Action...",
  subtitle = "Please wait while this task is being performed.",
  steps,
  currentStepIndex = 0,
  onForceDismiss,
}: PageLockOverlayProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Freeze background page scrolling and input interactions
  useEffect(() => {
    if (!isActive) {
      setElapsedSeconds(0);
      return;
    }

    const prevOverflow = document.body.style.overflow;
    const prevUserSelect = document.body.style.userSelect;

    document.body.style.overflow = "hidden";
    document.body.style.userSelect = "none";

    const blockEvent = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest("[data-allow-interaction='true']")) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener("wheel", blockEvent, { passive: false });
    window.addEventListener("touchmove", blockEvent, { passive: false });
    window.addEventListener("keydown", blockEvent, { capture: true });

    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener("wheel", blockEvent);
      window.removeEventListener("touchmove", blockEvent);
      window.removeEventListener("keydown", blockEvent, { capture: true });
      clearInterval(timer);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-label={title}
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/75 backdrop-blur-md select-none p-4 transition-all duration-300"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/15 bg-slate-950/95 p-6 sm:p-8 text-center text-slate-100 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10 space-y-5 animate-in fade-in zoom-in-95 duration-200"
        data-allow-interaction="true"
      >
        {/* Glowing Multiring AI Spinner */}
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 border-r-indigo-500 border-b-emerald-400 animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-dashed border-white/20 animate-[spin_3s_linear_infinite_reverse]" />
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-xl shadow-inner animate-pulse">
            ✨
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-bold tracking-tight text-white sm:text-xl">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Step Progression (if steps provided) */}
        {steps && steps.length > 0 && (
          <div className="space-y-2 rounded-xl bg-white/5 p-3.5 text-left border border-white/10">
            {steps.map((step, idx) => {
              const isDone = currentStepIndex > idx;
              const isCurrent = currentStepIndex === idx;

              return (
                <div key={idx} className="flex items-center gap-2.5 text-xs transition-colors">
                  {isDone ? (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                      ✓
                    </span>
                  ) : isCurrent ? (
                    <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                    </span>
                  ) : (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-500 text-[10px]">
                      {idx + 1}
                    </span>
                  )}
                  <span
                    className={
                      isCurrent
                        ? "font-semibold text-white"
                        : isDone
                        ? "text-slate-400 line-through decoration-slate-600"
                        : "text-slate-500"
                    }
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Animated Progress Bar */}
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full animate-[shimmer_1.6s_ease-in-out_infinite]" />
        </div>

        {/* Status Lock Pill */}
        <div className="flex flex-col items-center gap-2 pt-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300 border border-white/10">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>🔒 Page interaction locked until complete</span>
          </div>

          {/* Fallback dismiss button if process takes longer than 15s */}
          {elapsedSeconds >= 15 && onForceDismiss && (
            <button
              type="button"
              data-allow-interaction="true"
              onClick={onForceDismiss}
              className="text-[11px] text-slate-400 hover:text-white underline decoration-slate-600 hover:decoration-white transition-colors"
            >
              Taking longer than expected? Click to unlock
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
