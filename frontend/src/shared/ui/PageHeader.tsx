import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string | ReactNode;
  description?: string | ReactNode;
  badge?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * Standard responsive header for all application pages.
 * Stacks smoothly on mobile devices and aligns horizontally on desktop screens.
 */
export function PageHeader({
  title,
  description,
  badge,
  icon,
  actions,
  children,
  className = "",
}: PageHeaderProps) {
  return (
    <header className={`flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4 sm:pb-5 ${className}`}>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {icon && (
            <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary text-base sm:text-lg">
              {icon}
            </span>
          )}
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground truncate">
            {title}
          </h1>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0 pt-1 sm:pt-0">
          {actions}
        </div>
      )}

      {children}
    </header>
  );
}
