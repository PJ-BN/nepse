"use client";

import { useState } from "react";
import { useIpoPipeline } from "../hooks/useMacro";
import type { Issue } from "../types";

const TABS: { label: string; match: (i: Issue) => boolean }[] = [
  { label: "IPO pipeline", match: (i) => i.issue_type === "IPO" && i.stage === "PIPELINE" },
  { label: "IPO approved", match: (i) => i.issue_type === "IPO" && i.stage === "APPROVED" },
  { label: "Right share pipeline", match: (i) => i.issue_type === "RIGHT" && i.stage === "PIPELINE" },
];

const money = (v: number | null) => (v === null ? "—" : `${(v / 1e7).toLocaleString(undefined, { maximumFractionDigits: 2 })} cr`);

export function IpoPipelineTable() {
  const { data, error } = useIpoPipeline();
  const [tab, setTab] = useState(0);
  if (error) return <p className="text-sm text-red-600">Pipeline unavailable: {error.message}</p>;
  const rows = (data ?? []).filter(TABS[tab].match);
  const asOf = rows.find((r) => r.as_of_bs)?.as_of_bs;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        {TABS.map((t, i) => (
          <button key={t.label} type="button" onClick={() => setTab(i)}
                  className={`rounded border px-3 py-1 ${i === tab ? "border-blue-600 text-blue-700" : ""}`}>
            {t.label} ({(data ?? []).filter(t.match).length})
          </button>
        ))}
        {asOf && <span className="text-gray-500">SEBON list as on {asOf} BS</span>}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing listed.</p>
      ) : (
        <div className="max-h-96 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b text-left">
                <th className="px-2 py-1">Company</th>
                <th className="px-2 py-1">Sector</th>
                <th className="px-2 py-1 text-right">Units</th>
                <th className="px-2 py-1 text-right">Amount</th>
                <th className="px-2 py-1">Issue manager</th>
                <th className="px-2 py-1">{TABS[tab].label.includes("approved") ? "Approved (BS)" : "Applied (BS)"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.company}-${r.issue_type}-${r.stage}`} className="border-b">
                  <td className="px-2 py-1">{r.company}</td>
                  <td className="px-2 py-1">{r.sector ?? "—"}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{r.units?.toLocaleString() ?? "—"}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{money(r.amount)}</td>
                  <td className="px-2 py-1">{r.issue_manager ?? "—"}</td>
                  <td className="px-2 py-1 tabular-nums">{r.approval_date_bs ?? r.application_date_bs ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
