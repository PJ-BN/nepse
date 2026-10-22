"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCompanyFull } from "../api";
import { num } from "../format";

const pct = (s: string) => Number(s) / 100;

export function DcfWidget({ symbol, initial }: { symbol: string; initial: { growth: number; risk_free_rate: number; terminal_growth: number } }) {
  const [growth, setGrowth] = useState(String(initial.growth * 100));
  const [rf, setRf] = useState(String(initial.risk_free_rate * 100));
  const [terminal, setTerminal] = useState(String(initial.terminal_growth * 100));
  const g = pct(growth), r = pct(rf), t = pct(terminal);
  // Discount rate = rf + 7% ERP, so the Gordon terminal value needs it above terminal growth.
  const valid = [growth, rf, terminal].every((s) => s.trim() !== "" && Number.isFinite(Number(s))) && r + 0.07 > t;
  const { data } = useQuery({
    queryKey: ["dcf", symbol, g, r, t],
    queryFn: () => fetchCompanyFull(symbol, { dcf_growth: g, risk_free_rate: r, terminal_growth: t }),
    enabled: valid,
    placeholderData: (prev) => prev,
  });
  const field = (label: string, value: string, set: (v: string) => void) => (
    <label className="flex flex-col text-xs text-gray-500">
      {label}
      <input type="number" step="0.5" value={value} onChange={(e) => set(e.target.value)} className="w-24 rounded border px-2 py-1 text-sm text-black" />
    </label>
  );
  return (
    <div className="mt-3 border-t pt-3">
      <h3 className="text-sm font-medium">DCF 5y what-if</h3>
      <div className="mt-1 flex flex-wrap items-end gap-3">
        {field("Growth %", growth, setGrowth)}
        {field("Risk-free %", rf, setRf)}
        {field("Terminal growth %", terminal, setTerminal)}
        <span className="text-sm">{valid ? `Rs. ${num(data?.valuation.dcf?.per_share ?? null)}` : "invalid inputs"}</span>
      </div>
    </div>
  );
}
