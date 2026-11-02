"use client";

import { useAccumulation } from "../hooks/useFloorsheet";
import { TableContainer } from "@/shared/ui";

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

/** Smart-money accumulation scan; criteria mirror ACCUM_* in backend domain/floorsheet/metrics.py. */
export function AccumulationScanner({ onSelect }: { onSelect: (symbol: string) => void }) {
  const { data, isLoading, error } = useAccumulation();

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Last 10 sessions · Top-5 net-buyer share &gt; 35% · ATR &lt; 4% of price
      </p>

      {isLoading ? (
        <div className="py-6 space-y-2 animate-pulse">
          <div className="h-8 rounded-lg bg-muted/40" />
          <div className="h-8 rounded-lg bg-muted/30" />
          <div className="h-8 rounded-lg bg-muted/20" />
        </div>
      ) : error ? (
        <p className="text-xs text-rose-600 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">{error.message}</p>
      ) : !data?.length ? (
        <p className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-xl">No scrips match accumulation criteria right now.</p>
      ) : (
        <TableContainer scrollHint>
          <table className="min-w-full text-xs text-left tabular-nums">
            <thead className="bg-muted/20 border-b border-border/60 text-[10px] uppercase font-bold text-muted-foreground">
              <tr>
                <th className="py-2 px-2.5 w-6">#</th>
                <th className="py-2 px-3">Symbol</th>
                <th className="py-2 px-3 text-right">Top-5 Share</th>
                <th className="py-2 px-3 text-right">ATR</th>
                <th className="py-2 px-3 text-right">Brokers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono">
              {data.map((h, i) => (
                <tr key={h.symbol} className="hover:bg-muted/30 transition-colors">
                  <td className="py-2 px-2.5 text-muted-foreground text-[10px]">{i + 1}</td>
                  <td className="py-2 px-3">
                    <button
                      type="button"
                      className="font-bold text-primary hover:underline cursor-pointer"
                      title={h.sector ?? undefined}
                      onClick={() => onSelect(h.symbol)}
                    >
                      {h.symbol}
                    </button>
                  </td>
                  <td className="py-2 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{pct(h.top5_share)}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">{pct(h.atr_pct)}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">{h.top_brokers.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableContainer>
      )}
    </div>
  );
}
