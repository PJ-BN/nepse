"use client";

import React, { useState, useEffect, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../AuthContext";

export function AuthModal() {
  const { isAuthModalOpen, authModalMode, closeAuthModal, login, register, isAuthenticated, user, logout } =
    useAuth();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"login" | "register">(authModalMode);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMode(authModalMode);
    setError(null);
  }, [authModalMode, isAuthModalOpen]);

  useEffect(() => {
    if (!isAuthModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAuthModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen || !mounted) return null;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");

    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication request failed");
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl border border-border/80 bg-card p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-background text-xs font-bold">
              👤
            </span>
            <h2 className="text-base font-bold text-foreground">
              {isAuthenticated ? "User Account" : mode === "login" ? "Sign In to NEPSE" : "Create NEPSE Account"}
            </h2>
          </div>
          <button
            onClick={closeAuthModal}
            aria-label="Close modal"
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            ✕
          </button>
        </div>

        {isAuthenticated && user ? (
          <div className="mt-5 space-y-4 text-xs">
            <div className="rounded-2xl border border-border/80 bg-surface/80 p-4 space-y-2">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Account ID</span>
                <span className="font-mono text-foreground font-semibold">#{user.id}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Email Address</span>
                <span className="font-medium text-foreground">{user.email}</span>
              </div>
              {user.created_at && (
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Member Since</span>
                  <span className="text-foreground">{new Date(user.created_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-emerald-600 dark:text-emerald-400 font-medium leading-relaxed">
              ✓ Cloud Account Synced: Your watchlist and portfolio transactions are securely stored in the PostgreSQL database.
            </div>

            <button
              onClick={() => {
                logout();
                closeAuthModal();
              }}
              className="w-full rounded-xl bg-rose-600/90 hover:bg-rose-600 py-2.5 font-bold text-white transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="mt-5">
            <div className="flex rounded-xl bg-muted/30 p-1 mb-4 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                  mode === "login" ? "bg-card shadow-xs text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                  mode === "register" ? "bg-card shadow-xs text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <p className="text-muted-foreground leading-relaxed">
                {mode === "login"
                  ? "Access your synced watchlist, cloud portfolio, and saved analytics."
                  : "Register an account to persist your watchlist and portfolio in the cloud."}
              </p>

              <div>
                <label className="block font-semibold text-foreground mb-1">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="investor@example.com"
                  className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Password</label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={mode === "register" ? 8 : undefined}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder={mode === "register" ? "At least 8 characters" : "••••••••"}
                  className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all"
                />
              </div>

              {error && (
                <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-2.5 text-rose-500 font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-accent py-2.5 font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {busy ? "Processing..." : mode === "login" ? "Sign In" : "Create Account"}
              </button>

              <div className="pt-2 text-center text-muted-foreground">
                {mode === "login" ? (
                  <span>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("register")}
                      className="font-medium text-accent underline hover:opacity-80"
                    >
                      Sign up
                    </button>
                  </span>
                ) : (
                  <span>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className="font-medium text-accent underline hover:opacity-80"
                    >
                      Sign in
                    </button>
                  </span>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
