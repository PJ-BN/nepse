"use client";

import { useState } from "react";
import { useIpoPipeline } from "../hooks/useMacro";
import type { Issue } from "../types";
import { TableContainer } from "@/shared/ui";

const TABS: { label: string; match: (i: Issue) => boolean }[] = [
  { label: "IPO Pipeline", match: (i) => i.issue_type === "IPO" && i.stage === "PIPELINE" },
  { label: "IPO Approved", match: (i) => i.issue_type === "IPO" && i.stage === "APPROVED" },
  { label: "Right Shares Pipeline", match: (i) => i.issue_type === "RIGHT" && i.stage === "PIPELINE" },
];

const money = (v: number | null) => (v === null ? "—" : `${(v / 1e7).toLocaleString(undefined, { maximumFractionDigits: 2 })} Cr`);

export function IpoPipelineTable() {
  const { data, error, isLoading } = useIpoPipeline();
  const [tab, setTab] = useState(0);

  if (error) {
    return (
      <p className="text-xs text-rose-600 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
        Pipeline unavailable: {error.message}
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="py-8 space-y-2 animate-pulse">
        <div className="h-10 rounded-xl bg-muted/40" />
        <div className="h-10 rounded-xl bg-muted/30" />
        <div className="h-10 rounded-xl bg-muted/20" />
      </div>
    );
  }

  const rows = (data ?? []).filter(TABS[tab].match);
  const asOf = rows.find((r) => r.as_of_bs)?.as_of_bs;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {TABS.map((t, i) => {
            const count = (data ?? []).filter(t.match).length;
            return (
              <button
                key={t.label}
                type="button"
                onClick={() => setTab(i)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  i === tab
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {t.label} ({count})
              </button>
            );
          })}
        </div>

        {asOf && (
          <span className="text-xs text-muted-foreground font-mono">
            SEBON list as of {asOf} BS
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-6 text-center">No issues currently listed in this stage.</p>
      ) : (
        <TableContainer maxHeight="32rem" scrollHint>
          <table className="min-w-full text-xs text-left">
            <thead className="sticky top-0 z-10 bg-card border-b border-border/80 text-[10px] uppercase font-bold text-muted-foreground shadow-2xs">
              <tr>
                <th className="py-2.5 px-3">Company Name</th>
                <th className="py-2.5 px-3">Sector</th>
                <th className="py-2.5 px-3 text-right">Units</th>
                <th className="py-2.5 px-3 text-right">Amount (NPR)</th>
                <th className="py-2.5 px-3">Issue Manager</th>
                <th className="py-2.5 px-3">
                  {TABS[tab].label.includes("Approved") ? "Approved (BS)" : "Applied (BS)"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono">
              {rows.map((r) => (
                <tr key={`${r.company}-${r.issue_type}-${r.stage}`} className="hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 font-sans font-bold text-foreground truncate max-w-[200px] sm:max-w-none">
                    {r.company}
                  </td>
                  <td className="py-2.5 px-3 font-sans text-muted-foreground">{r.sector ?? "—"}</td>
                  <td className="py-2.5 px-3 text-right text-foreground">{r.units?.toLocaleString() ?? "—"}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {money(r.amount)}
                  </td>
                  <td className="py-2.5 px-3 font-sans text-muted-foreground">{r.issue_manager ?? "—"}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">
                    {r.approval_date_bs ?? r.application_date_bs ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableContainer>
      )}
    </div>
  );
}
