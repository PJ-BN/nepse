"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "../AuthContext";

export function UserMenu() {
  const { isAuthenticated, user, openAuthModal, logout, isLoading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="h-8 w-20 animate-pulse rounded-lg bg-muted/40" />
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <button
        onClick={() => openAuthModal("login")}
        className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-surface/50 px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-muted/40 hover:border-accent/40 active:scale-95 cursor-pointer"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span>Sign In</span>
      </button>
    );
  }

  const emailInitial = user.email ? user.email.charAt(0).toUpperCase() : "U";
  const shortEmail = user.email.length > 18 ? `${user.email.slice(0, 16)}...` : user.email;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 rounded-lg border border-border/70 bg-surface/80 px-2.5 py-1 text-xs font-medium text-foreground transition-all hover:bg-muted/40 focus:outline-none cursor-pointer"
        aria-expanded={dropdownOpen}
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-accent/20 text-accent font-bold text-[10px]">
          {emailInitial}
        </span>
        <span className="hidden sm:inline max-w-[120px] truncate">{shortEmail}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-border/80 bg-card p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="border-b border-border/50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Logged In As</p>
            <p className="truncate text-xs font-bold text-foreground mt-0.5">{user.email}</p>
            <p className="text-[10px] text-emerald-500 font-medium flex items-center gap-1 mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Cloud Account Synced
            </p>
          </div>

          <div className="p-1 text-xs">
            <button
              onClick={() => {
                setDropdownOpen(false);
                openAuthModal("login");
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground cursor-pointer text-left"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              Account Details
            </button>

            <button
              onClick={() => {
                setDropdownOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-rose-500 transition-colors hover:bg-rose-500/10 cursor-pointer text-left"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
