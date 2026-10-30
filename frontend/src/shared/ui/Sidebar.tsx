"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { DataSyncModal } from "@/features/sync";
import { UserMenu } from "@/features/auth";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Intelligence & Overview",
    items: [
      {
        href: "/",
        label: "Market Dashboard",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect width="7" height="9" x="3" y="3" rx="1" />
            <rect width="7" height="5" x="14" y="3" rx="1" />
            <rect width="7" height="9" x="14" y="12" rx="1" />
            <rect width="7" height="5" x="3" y="16" rx="1" />
          </svg>
        ),
      },
      {
        href: "/watchlist",
        label: "Watchlist & Agent",
        badge: "AI",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ),
      },
      {
        href: "/portfolio",
        label: "Portfolio & AI",
        badge: "AI",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect width="20" height="14" x="2" y="7" rx="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Markets & Analytics",
    items: [
      {
        href: "/chart",
        label: "Interactive Chart",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
        ),
      },
      {
        href: "/floorsheet",
        label: "Live Floorsheet",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
            <path d="M10 9H8" />
          </svg>
        ),
      },
      {
        href: "/screener",
        label: "Stock Screener",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
        ),
      },
      {
        href: "/company",
        label: "Listed Companies",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
            <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
            <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
            <path d="M10 6h4" />
            <path d="M10 10h4" />
            <path d="M10 14h4" />
            <path d="M10 18h4" />
          </svg>
        ),
      },
      {
        href: "/broker",
        label: "Broker Analytics",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="3" y1="21" x2="21" y2="21" />
            <line x1="6" y1="18" x2="6" y2="9" />
            <line x1="10" y1="18" x2="10" y2="9" />
            <line x1="14" y1="18" x2="14" y2="9" />
            <line x1="18" y1="18" x2="18" y2="9" />
            <polygon points="12 2 20 7 4 7 12 2" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Research & Tools",
    items: [
      {
        href: "/news",
        label: "News & Regulatory",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
            <path d="M18 14h-8" />
            <path d="M15 18h-5" />
            <path d="M10 6h8v4h-8V6Z" />
          </svg>
        ),
      },
      {
        href: "/dividends",
        label: "Dividends & AGM",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="8" />
            <path d="M12 6v12" />
            <path d="M15 9.5a2.5 2.5 0 0 0-5 0c0 3 5 2 5 5a2.5 2.5 0 0 1-5 0" />
          </svg>
        ),
      },
      {
        href: "/ipo",
        label: "IPO & Right Shares",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m4.5 16.5-1.5 3 3-1.5" />
            <path d="m4.5 16.5 4.5 4.5c3-1.5 6-4.5 7.5-7.5l-4.5-4.5c-3 1.5-6 4.5-7.5 7.5Z" />
            <path d="m16.5 4.5 3-1.5-1.5 3" />
            <path d="M12 15l-3-3" />
          </svg>
        ),
      },
      {
        href: "/mutual-funds",
        label: "Mutual Funds",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
            <path d="M22 12A10 10 0 0 0 12 2v10z" />
          </svg>
        ),
      },
      {
        href: "/macro",
        label: "Macro & NRB",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        ),
      },
      {
        href: "/simulator",
        label: "Trade Simulator",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="6" y1="12" x2="10" y2="12" />
            <line x1="8" y1="10" x2="8" y2="14" />
            <line x1="15" y1="13" x2="15.01" y2="13" />
            <line x1="18" y1="11" x2="18.01" y2="11" />
            <rect width="20" height="12" x="2" y="6" rx="6" />
          </svg>
        ),
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileOpen]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const NavList = ({ onSelect }: { onSelect?: () => void }) => (
    <div className="space-y-6">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title} className="space-y-1">
          <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            {section.title}
          </h3>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onSelect}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                    active
                      ? "bg-accent/15 text-accent font-semibold shadow-2xs"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`shrink-0 transition-colors ${
                        active ? "text-accent" : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="shrink-0 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wide">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* ======================================================== */}
      {/* 1. Mobile Header (Only visible on screens < 768px)       */}
      {/* ======================================================== */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b bg-background/90 backdrop-blur-md px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-foreground text-sm">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-background">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 17l6-6 4 4 8-8" />
                <path d="M15 7h6v6" />
              </svg>
            </span>
            <span>NEPSE Analytics</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. Mobile Drawer Navigation                             */}
      {/* ======================================================== */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative flex w-72 max-w-[85vw] flex-col bg-card border-r border-border shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Top header of drawer */}
            <div className="flex items-center justify-between border-b border-border/80 px-4 py-3.5">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 font-bold tracking-tight text-foreground text-sm"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-background shadow-xs">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 17l6-6 4 4 8-8" />
                    <path d="M15 7h6v6" />
                  </svg>
                </span>
                <div className="flex flex-col">
                  <span>NEPSE Analytics</span>
                  <span className="text-[10px] font-mono text-muted-foreground font-normal">v2.0 · Pro Suite</span>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable links */}
            <div className="flex-1 overflow-y-auto p-3.5 [scrollbar-width:thin]">
              <NavList onSelect={() => setMobileOpen(false)} />
            </div>

            {/* Bottom Footer */}
            <div className="border-t border-border/80 p-3 bg-muted/20 flex flex-col gap-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-medium text-muted-foreground">Options</span>
                <div className="flex items-center gap-1.5">
                  <DataSyncModal />
                  <ThemeToggle />
                </div>
              </div>
              <div className="w-full">
                <UserMenu />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. Desktop Left Sidebar (Visible on md and larger)      */}
      {/* ======================================================== */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/95 backdrop-blur-md h-screen sticky top-0 shrink-0 z-30 select-none">
        {/* Brand Header */}
        <div className="border-b border-border/80 px-4 py-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-background shadow-xs group-hover:scale-105 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 17l6-6 4 4 8-8" />
                <path d="M15 7h6v6" />
              </svg>
            </span>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm tracking-tight text-foreground truncate">NEPSE Analytics</span>
              <span className="text-[10px] text-muted-foreground font-mono">v2.0 · Pro Suite</span>
            </div>
          </Link>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin]">
          <NavList />
        </div>

        {/* Sticky Desktop Footer */}
        <div className="border-t border-border/80 p-3 bg-muted/15 flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-medium text-muted-foreground">Preferences</span>
            <div className="flex items-center gap-1.5">
              <DataSyncModal />
              <ThemeToggle />
            </div>
          </div>
          <div className="w-full">
            <UserMenu />
          </div>
        </div>
      </aside>
    </>
  );
}
