import type { ReactNode } from "react";

export interface TableContainerProps {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
  scrollHint?: boolean;
}

/**
 * Standard responsive container for data tables.
 * Prevents horizontal page clipping on mobile devices by providing a smooth,
 * self-contained scroll view with optional scroll hints.
 */
export function TableContainer({
  children,
  className = "",
  maxHeight,
  scrollHint = false,
}: TableContainerProps) {
  return (
    <div className="relative w-full min-w-0">
      <div
        className={`w-full overflow-x-auto rounded-xl sm:rounded-2xl border border-border/80 bg-card shadow-2xs [scrollbar-width:thin] [-webkit-overflow-scrolling:touch] ${className}`}
        style={maxHeight ? { maxHeight } : undefined}
      >
        {children}
      </div>
      {scrollHint && (
        <span className="sm:hidden block text-[10px] text-muted-foreground/70 text-right mt-1 font-mono">
          ← Swipe horizontally to view full table →
        </span>
      )}
    </div>
  );
}
