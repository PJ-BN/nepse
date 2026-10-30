"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useAuth } from "@/features/auth";
import {
  fetchUserWatchlist,
  addUserWatchlistSymbol,
  removeUserWatchlistSymbol,
  syncUserWatchlist,
} from "./api";

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
  const { isAuthenticated, token } = useAuth();
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  // Load from server when authenticated, or localStorage when guest
  useEffect(() => {
    let active = true;

    if (isAuthenticated && token) {
      fetchUserWatchlist()
        .then((serverList) => {
          if (!active) return;
          if (serverList.length === 0) {
            // If server has no watchlist yet, migrate local watchlist up
            const local = getStoredWatchlist();
            if (local.length > 0) {
              syncUserWatchlist(local).then((synced) => {
                if (active) {
                  setWatchlist(synced);
                  saveWatchlist(synced);
                }
              });
              return;
            }
          }
          setWatchlist(serverList);
          saveWatchlist(serverList);
        })
        .catch((err) => {
          console.warn("Failed to fetch cloud watchlist, falling back to local:", err);
          if (active) setWatchlist(getStoredWatchlist());
        });
    } else {
      setWatchlist(getStoredWatchlist());
    }

    const handleUpdate = () => {
      startTransition(() => {
        if (!isAuthenticated) {
          setWatchlist(getStoredWatchlist());
        }
      });
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      active = false;
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [isAuthenticated, token]);

  const isWatchlisted = useCallback(
    (symbol: string): boolean => {
      return watchlist.includes(symbol.toUpperCase());
    },
    [watchlist]
  );

  const addToWatchlist = useCallback(
    (symbol: string): void => {
      const upper = symbol.toUpperCase();
      if (!watchlist.includes(upper)) {
        const next = [...watchlist, upper];
        setWatchlist(next);
        saveWatchlist(next);
        if (isAuthenticated) {
          addUserWatchlistSymbol(upper).catch((err) =>
            console.error("Failed to sync added symbol to cloud:", err)
          );
        }
      }
    },
    [watchlist, isAuthenticated]
  );

  const removeFromWatchlist = useCallback(
    (symbol: string): void => {
      const upper = symbol.toUpperCase();
      const next = watchlist.filter((s) => s !== upper);
      setWatchlist(next);
      saveWatchlist(next);
      if (isAuthenticated) {
        removeUserWatchlistSymbol(upper).catch((err) =>
          console.error("Failed to sync removed symbol from cloud:", err)
        );
      }
    },
    [watchlist, isAuthenticated]
  );

  const toggleWatchlist = useCallback(
    (symbol: string): void => {
      if (isWatchlisted(symbol)) {
        removeFromWatchlist(symbol);
      } else {
        addToWatchlist(symbol);
      }
    },
    [isWatchlisted, removeFromWatchlist, addToWatchlist]
  );

  const clearWatchlist = useCallback((): void => {
    setWatchlist([]);
    saveWatchlist([]);
    if (isAuthenticated) {
      syncUserWatchlist([]).catch((err) =>
        console.error("Failed to clear cloud watchlist:", err)
      );
    }
  }, [isAuthenticated]);

  return {
    watchlist,
    isWatchlisted,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    clearWatchlist,
    isCloudSynced: isAuthenticated,
  };
}
