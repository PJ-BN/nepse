"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import { Sidebar } from "./Sidebar";
import { useNavbar } from "./NavbarContext";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "@/features/auth";

export function AppShell({ children }: { children: ReactNode }) {
  const { isVisible, toggleNavbar, isMac } = useNavbar();
  const shortcutHint = isMac ? "⌘B" : "Ctrl+B";

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col w-full overflow-x-hidden">
        {/* Desktop Top Strip visible only when navbar is hidden */}
        {!isVisible && (
          <header className="hidden md:flex sticky top-0 z-30 h-13 w-full items-center justify-between border-b border-border/80 bg-background/95 backdrop-blur-md px-4 transition-all">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleNavbar}
                title={`Show navigation bar (${shortcutHint})`}
                aria-label="Show navigation bar"
                className="flex items-center gap-2 rounded-lg border border-border/80 bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-accent/15 hover:border-accent/40 hover:text-accent transition-all cursor-pointer shadow-2xs group"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted-foreground group-hover:text-accent transition-colors"
                  aria-hidden
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M9 3v18" />
                  <path d="m14 15 3-3-3-3" />
                </svg>
                <span>Show Navbar</span>
                <kbd className="hidden lg:inline-block rounded bg-muted/80 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground border border-border/50 group-hover:border-accent/30 group-hover:text-accent">
                  {shortcutHint}
                </kbd>
              </button>

              <Link href="/" className="flex items-center gap-2 group">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-background shadow-2xs group-hover:scale-105 transition-transform">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M3 17l6-6 4 4 8-8" />
                    <path d="M15 7h6v6" />
                  </svg>
                </span>
                <span className="font-bold text-sm tracking-tight text-foreground">
                  NEPSE Analytics
                </span>
                <span className="text-[10px] font-mono text-muted-foreground hidden lg:inline">
                  v2.0
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <UserMenu direction="down" />
            </div>
          </header>
        )}
        {children}
      </div>
    </div>
  );
}
