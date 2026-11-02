"use client";

import Link from "next/link";
import { useBrokerProfile } from "../hooks/useBrokerProfile";
import type { ProfileWindow } from "../types";
import { TableContainer } from "@/shared/ui";

const crore = (v: number) => `${(v / 1e7).toFixed(2)} Cr`;

function WindowCard({ w }: { w: ProfileWindow }) {
  const sectors = Object.entries(w.sectors);
  const max = Math.max(1, ...sectors.map(([, v]) => Math.abs(v)));

  return (
    <section className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-3">
          <h2 className="text-base font-bold capitalize text-foreground flex items-center gap-2">
            <span>📅</span>
            <span>{w.label} Window</span>
          </h2>
          <span className="text-xs font-mono font-medium text-muted-foreground rounded-full bg-muted/50 px-2 py-0.5">
            {w.days} trading days
          </span>
        </div>

        {w.top_stocks.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No net accumulation recorded.</p>
        ) : (
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Top Accumulated Scrips
            </span>
            <TableContainer scrollHint>
              <table className="min-w-full text-right text-xs tabular-nums">
                <thead className="bg-muted/20 border-b border-border/60 text-[10px] uppercase font-bold text-muted-foreground">
                  <tr>
                    <th className="py-2 px-3 text-left">Symbol</th>
                    <th className="py-2 px-2.5">Net Qty</th>
                    <th className="py-2 px-2.5">Net Rs</th>
                    <th className="py-2 px-3">Buy VWAP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {w.top_stocks.map((s) => (
                    <tr key={s.symbol} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 text-left">
                        <Link
                          href={`/floorsheet?symbol=${encodeURIComponent(s.symbol)}`}
                          className="font-mono font-bold text-primary hover:underline"
                        >
                          {s.symbol}
                        </Link>
                      </td>
                      <td className="py-2 px-2.5 font-medium">{s.net_qty.toLocaleString("en-IN")}</td>
                      <td className="py-2 px-2.5 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{crore(s.net_amt)}</td>
                      <td className="py-2 px-3 font-mono">{s.buy_vwap?.toFixed(2) ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
          </div>
        )}
      </div>

      <div className="border-t border-border/60 pt-3">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Sector Rotation (Net Capital)
        </h3>
        {sectors.length === 0 ? (
          <p className="text-xs text-muted-foreground">No sector activity.</p>
        ) : (
          <ul className="space-y-2 text-xs">
            {sectors.map(([sector, v]) => (
              <li key={sector} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate font-medium text-foreground text-[11px]" title={sector}>
                  {sector}
                </span>
                <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden flex items-center">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${v >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                    style={{ width: `${Math.max(4, (Math.abs(v) / max) * 100)}%` }}
                  />
                </div>
                <span className={`w-16 text-right tabular-nums text-[11px] font-mono font-semibold ${v >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {crore(v)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function BrokerProfileView({ broker }: { broker: number }) {
  const { data, error, isLoading } = useBrokerProfile(broker);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-80 rounded-2xl bg-card border border-border/60" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-600">
        <p className="font-bold">Broker profile unavailable</p>
        <p className="text-xs text-rose-600/80">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {data?.windows.map((w) => (
        <WindowCard key={w.label} w={w} />
      ))}
    </div>
  );
}
