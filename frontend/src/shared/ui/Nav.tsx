"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  ["/", "Dashboard"],
  ["/chart", "Chart"],
  ["/watchlist", "Watchlist & Agent"],
  ["/floorsheet", "Floorsheet"],
  ["/company", "Companies"],
  ["/news", "News"],
  ["/broker", "Brokers"],
  ["/screener", "Screener"],
  ["/simulator", "Simulator"],
  ["/mutual-funds", "Mutual funds"],
  ["/macro", "Macro"],
  ["/dividends", "Dividends"],
  ["/ipo", "IPO"],
  ["/portfolio", "Portfolio"],
] as const;

export function Nav() {
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-2.5 text-sm">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-background">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 17l6-6 4 4 8-8" />
              <path d="M15 7h6v6" />
            </svg>
          </span>
          <span className="hidden sm:inline">NEPSE Analytics</span>
        </Link>
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
          {LINKS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`shrink-0 rounded-lg px-3 py-1.5 transition-colors ${
                active(href) ? "bg-accent/12 font-medium text-accent" : "text-gray-500 hover:bg-gray-100 hover:text-foreground"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
        <ThemeToggle />
      </nav>
    </header>
  );
}
