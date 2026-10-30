"use client";

export const AUTH_TOKEN_KEY = "nepse_auth_token";
export const LEGACY_PORTFOLIO_TOKEN_KEY = "nepse.portfolio.token";

const listeners = new Set<(token: string | null) => void>();

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(LEGACY_PORTFOLIO_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      sessionStorage.setItem(LEGACY_PORTFOLIO_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(LEGACY_PORTFOLIO_TOKEN_KEY);
    }
  } catch (err) {
    console.error("Failed to persist auth token:", err);
  }
  listeners.forEach((listener) => listener(token));
}

export function subscribeAuthToken(listener: (token: string | null) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
