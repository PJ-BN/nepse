"use client";

import { useState, type FormEvent } from "react";
import { login, register } from "../api";
import { setToken } from "../hooks/useToken";

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const fn = mode === "login" ? login : register;
      setToken((await fn(String(f.get("email")), String(f.get("password")))).access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex max-w-sm flex-col gap-3 rounded border p-4">
      <h2 className="text-lg font-semibold">{mode === "login" ? "Log in" : "Create account"}</h2>
      <label className="flex flex-col text-sm">
        Email
        <input name="email" type="email" required autoComplete="email" className="rounded border px-2 py-1" />
      </label>
      <label className="flex flex-col text-sm">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={mode === "register" ? 8 : undefined}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="rounded border px-2 py-1"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        disabled={busy}
        className="rounded bg-foreground px-3 py-1 text-background disabled:opacity-50"
      >
        {mode === "login" ? "Log in" : "Register"}
      </button>
      <button
        type="button"
        className="text-sm underline"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
      >
        {mode === "login" ? "Need an account? Register" : "Have an account? Log in"}
      </button>
    </form>
  );
}
