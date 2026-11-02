import type { ReactNode } from "react";

export interface ResponsiveCardProps {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}

/**
 * Standard responsive surface container with adaptive padding and rounded corners.
 */
export function ResponsiveCard({
  children,
  className = "",
  as: Component = "section",
}: ResponsiveCardProps) {
  return (
    <Component
      className={`rounded-2xl sm:rounded-3xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs min-w-0 overflow-hidden ${className}`}
    >
      {children}
    </Component>
  );
}
