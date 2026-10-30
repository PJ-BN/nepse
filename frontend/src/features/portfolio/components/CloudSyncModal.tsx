"use client";

import { useState, useEffect, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { login, register } from "../api";
import { setToken } from "../hooks/useToken";

export function CloudSyncModal({
  isOpen,
  onClose,
  token,
}: {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
}) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const fn = mode === "login" ? login : register;
      const res = await fn(String(f.get("email")), String(f.get("password")));
      setToken(res.access_token);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl border border-border/80 bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">☁️</span>
            <h2 className="text-base font-bold text-foreground">
              {token ? "Cloud Account Active" : mode === "login" ? "Log in to Cloud Account" : "Register Account"}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted/40">
            ✕
          </button>
        </div>

        {token ? (
          <div className="mt-4 space-y-4 text-xs">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ Connected to NEPSE backend API server. Your transactions are backed up to PostgreSQL.
            </div>
            <button
              onClick={() => {
                setToken(null);
                onClose();
              }}
              className="w-full rounded-xl bg-rose-600 py-2.5 font-bold text-white hover:bg-rose-700 transition-colors"
            >
              Log out (Switch to Local Storage)
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3.5 text-xs">
            <p className="text-muted-foreground">
              Optional: Sign in to sync your portfolio across devices and store trades securely in the database.
            </p>

            <div>
              <label className="block font-bold text-foreground mb-1">Email</label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="investor@example.com"
                className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-foreground mb-1">Password</label>
              <input
                name="password"
                type="password"
                required
                minLength={mode === "register" ? 8 : undefined}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
              />
            </div>

            {error && (
              <p role="alert" className="text-rose-600 dark:text-rose-400 font-medium">
                {error}
              </p>
            )}

            <button
              disabled={busy}
              className="w-full rounded-xl bg-primary py-2.5 font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {busy ? "Authenticating…" : mode === "login" ? "Log In" : "Register"}
            </button>

            <button
              type="button"
              className="w-full text-center text-xs text-muted-foreground underline hover:text-foreground"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Need an account? Register" : "Already have an account? Log in"}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
