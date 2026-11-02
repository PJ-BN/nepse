import type { ReactNode } from "react";

export interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "standard" | "narrow" | "wide" | "full";
  as?: "main" | "div" | "section";
}

const MAX_WIDTH_MAP = {
  narrow: "max-w-4xl",
  standard: "max-w-[1440px]",
  wide: "max-w-[1680px]",
  full: "max-w-full",
};

/**
 * Standard responsive page container ensuring consistent edge padding across
 * mobile (<640px), tablet (640-1024px), and desktop (1024px+) viewports.
 * Prevents horizontal scrolling overflow bugs on smaller screens.
 */
export function PageContainer({
  children,
  className = "",
  maxWidth = "standard",
  as: Component = "main",
}: PageContainerProps) {
  return (
    <Component
      className={`mx-auto w-full ${MAX_WIDTH_MAP[maxWidth]} min-w-0 px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 overflow-x-hidden ${className}`}
    >
      {children}
    </Component>
  );
}
