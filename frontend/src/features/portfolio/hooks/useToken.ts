"use client";

import { useSyncExternalStore } from "react";

// Access token lives in sessionStorage (dies with the tab), mirrored to subscribers.
const KEY = "nepse.portfolio.token";
const listeners = new Set<() => void>();

function read(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(KEY, token);
    else sessionStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((l) => l());
}

export function useToken(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => null,
  );
}
