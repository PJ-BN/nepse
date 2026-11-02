"use client";

import Link from "next/link";
import type { CompanyFull } from "../types";
import { crore, num } from "../format";
import { useWatchlist } from "@/features/watchlist/useWatchlist";

export function Profile({ data }: { data: CompanyFull }) {
  const { profile: p, price } = data;
  const { isWatchlisted, toggleWatchlist } = useWatchlist();
  const starred = isWatchlisted(p.symbol);

  return (
    <section className="rounded-2xl sm:rounded-3xl border border-border/80 p-4 sm:p-6 bg-card shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">
              {p.name} <span className="font-mono text-muted-foreground font-normal">({p.symbol})</span>
            </h1>
            <button
              onClick={() => toggleWatchlist(p.symbol)}
              title={starred ? "Remove from personal watchlist" : "Add to personal watchlist"}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                starred
                  ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                  : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border"
              }`}
            >
              <span>{starred ? "⭐ Watchlisted" : "☆ Add to Watchlist"}</span>
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {p.sector_code ?? "Unclassified"} · {p.instrument_type} · <Link href="/watchlist" className="text-primary hover:underline font-medium">View in AI Agent</Link>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start md:self-auto">
          <Link
            href={`/chart?symbol=${p.symbol}`}
            className="rounded-xl border border-border/80 px-3.5 py-1.5 text-xs font-semibold hover:bg-muted transition-colors"
          >
            📈 Chart
          </Link>
          <Link
            href={`/simulator?symbol=${p.symbol}`}
            className="rounded-xl border border-border/80 px-3.5 py-1.5 text-xs font-semibold hover:bg-muted transition-colors"
          >
            🎮 Trade in Simulator
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1.5 text-xs border-t border-border/50 pt-3">
        <span className="text-xl font-bold font-mono">
          {price.ltp == null ? "No price yet" : `NPR ${num(price.ltp)}`}
        </span>
        {price.source && (
          <span className="text-muted-foreground">
            {price.source === "live" ? "Live" : "Close"} · {price.as_of}
          </span>
        )}
        <span>52W: <strong className="font-mono">{num(price.low_52w)} – {num(price.high_52w)}</strong></span>
        <span>Listed shares: <strong className="font-mono">{num(p.listed_shares, 0)}</strong></span>
        <span>Paid-up: <strong className="font-mono">{crore(p.paid_up_capital)}</strong></span>
        {p.promoter_pct != null && (
          <span>
            Promoter / public: <strong className="font-mono">{num(p.promoter_pct)}% / {num(100 - p.promoter_pct)}%</strong>
          </span>
        )}
      </div>
    </section>
  );
}
