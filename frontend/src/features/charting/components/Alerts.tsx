"use client";

import { useEffect, useState } from "react";
import { useLiveFeed, useLiveIndices, useLiveQuotes } from "@/features/live-feed";
import { makeAlert, triggered, type Alert } from "../alerts";

const SHOW_MS = 10_000;

/** Watches the live feed and fires a toast (plus a browser notification when permitted) once an alert's level is reached. */
export function AlertToasts({ alerts, onChange }: { alerts: Alert[]; onChange: (next: Alert[]) => void }) {
  useLiveFeed();
  const quotes = useLiveQuotes();
  const indices = useLiveIndices();
  const [toasts, setToasts] = useState<Alert[]>([]);

  useEffect(() => {
    const { fired, rest } = triggered(alerts, (s) => quotes[s]?.ltp ?? indices[s]?.value);
    if (!fired.length) return;
    onChange(rest);
    setToasts((p) => [...fired, ...p]);
    // No cleanup on purpose: each batch must expire on its own even when the next tick re-runs this effect.
    setTimeout(() => setToasts((p) => p.filter((x) => !fired.includes(x))), SHOW_MS);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      fired.forEach((a) => new Notification(`${a.symbol} alert`, { body: `Price ${a.dir === "above" ? "rose to" : "fell to"} ${a.price}` }));
    }
  }, [alerts, quotes, indices, onChange]);

  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((a) => (
        <div key={a.id} className="rounded border border-sky-500 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-lg">
          🔔 <span className="font-semibold">{a.symbol}</span> {a.dir === "above" ? "rose to" : "fell to"} {a.price}
        </div>
      ))}
    </div>
  );
}

/** Set a price alert for one chart's symbol and list/remove its pending ones. `last` is the reference price. */
export function AlertControl({
  symbol,
  last,
  alerts,
  onAdd,
  onRemove,
}: {
  symbol: string;
  last: number | undefined;
  alerts: Alert[];
  onAdd: (a: Alert) => void;
  onRemove: (id: string) => void;
}) {
  const [price, setPrice] = useState("");
  const value = Number(price);
  return (
    <span className="flex flex-wrap items-center gap-1 text-xs">
      <input
        type="number"
        step="any"
        min={0}
        aria-label="Alert price"
        placeholder={last ? String(last) : "Price"}
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="w-20 rounded border bg-background px-1 py-0.5"
      />
      <button
        type="button"
        className="rounded border px-2 py-0.5 hover:bg-hover disabled:opacity-40"
        disabled={!symbol || !(value > 0) || last === undefined}
        onClick={() => {
          onAdd(makeAlert(symbol, value, last!));
          setPrice("");
          if (typeof Notification !== "undefined" && Notification.permission === "default") void Notification.requestPermission();
        }}
      >
        🔔 Alert
      </button>
      {alerts.map((a) => (
        <span key={a.id} className="flex items-center gap-1 rounded border border-amber-500 px-1.5 py-0.5">
          {a.dir === "above" ? "≥" : "≤"} {a.price}
          <button type="button" aria-label={`Remove alert at ${a.price}`} onClick={() => onRemove(a.id)}>✕</button>
        </span>
      ))}
    </span>
  );
}
