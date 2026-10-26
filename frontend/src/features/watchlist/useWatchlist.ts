"use client";

import { useEffect, useState, useTransition } from "react";

const STORAGE_KEY = "nepse_personal_watchlist";
const EVENT_NAME = "nepse_watchlist_updated";

function getStoredWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return ["NABIL", "CHCL", "GBIME"]; // default helpful starter watchlist
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((s) => String(s).toUpperCase()) : [];
  } catch {
    return ["NABIL", "CHCL", "GBIME"];
  }
}

function saveWatchlist(symbols: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: symbols }));
  } catch (e) {
    console.error("Failed to save watchlist to localStorage:", e);
  }
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    // Initial read
    setWatchlist(getStoredWatchlist());

    const handleUpdate = () => {
      startTransition(() => {
        setWatchlist(getStoredWatchlist());
      });
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const isWatchlisted = (symbol: string): boolean => {
    return watchlist.includes(symbol.toUpperCase());
  };

  const addToWatchlist = (symbol: string): void => {
    const upper = symbol.toUpperCase();
    if (!watchlist.includes(upper)) {
      const next = [...watchlist, upper];
      setWatchlist(next);
      saveWatchlist(next);
    }
  };

  const removeFromWatchlist = (symbol: string): void => {
    const upper = symbol.toUpperCase();
    const next = watchlist.filter((s) => s !== upper);
    setWatchlist(next);
    saveWatchlist(next);
  };

  const toggleWatchlist = (symbol: string): void => {
    if (isWatchlisted(symbol)) {
      removeFromWatchlist(symbol);
    } else {
      addToWatchlist(symbol);
    }
  };

  const clearWatchlist = (): void => {
    setWatchlist([]);
    saveWatchlist([]);
  };

  return {
    watchlist,
    isWatchlisted,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    clearWatchlist,
  };
}
