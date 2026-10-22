import { fmt, fmtPct, tone } from "../format";
import type { IndexValue } from "../types";

export function IndexStrip({ index, subIndices }: { index: IndexValue | null; subIndices: IndexValue[] }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {[...(index ? [index] : []), ...subIndices].map((i) => (
        <div key={i.code} className={`min-w-32 shrink-0 rounded border px-3 py-2 ${i.code === "NEPSE" ? "border-foreground" : ""}`}>
          <div className="text-xs text-gray-500">{i.code}</div>
          <div className="font-mono text-sm font-semibold">{fmt(i.value)}</div>
          <div className={`font-mono text-xs ${tone(i.change)}`}>
            {fmt(i.change)} ({fmtPct(i.pct_change)})
          </div>
        </div>
      ))}
    </div>
  );
}
