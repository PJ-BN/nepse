"use client";

import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { calc } from "../api";
import type { CalcInput, InvestorType } from "../types";
import { npr, today } from "./format";

const LABELS: Record<string, string> = {
  amount: "Amount",
  brokerage: "Brokerage",
  sebon_fee: "SEBON fee",
  dp_charge: "DP charge",
  total_fees: "Total fees",
  total_payable: "Total payable",
  cost_per_share: "Cost per share",
  buy_total_payable: "Purchase cost (incl. fees)",
  cost_basis: "Cost basis",
  cgt: "Capital gains tax",
  net_receivable: "Net receivable",
  realized_pnl: "Profit / loss",
};
const input = "w-full rounded-xl border border-input bg-card px-3 py-2 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono";

export function FeeCalculator() {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const run = useMutation({ mutationFn: calc });

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body: CalcInput = {
      side,
      qty: Number(f.get("qty")),
      rate: String(f.get("rate")),
      investor_type: String(f.get("investor_type")) as InvestorType,
    };
    if (side === "SELL") {
      body.buy_rate = String(f.get("buy_rate"));
      body.buy_date = String(f.get("buy_date"));
      body.sell_date = String(f.get("sell_date"));
    }
    run.mutate(body);
  }

  const r = run.data;
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
      <div className="border-b border-border/60 pb-2.5">
        <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
          <span>🧮</span>
          <span>NEPSE Brokerage, SEBON & Capital Gains Tax Calculator</span>
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Calculates official SEBON regulatory fees, DP charges, tiered broker slabs, and holding period tax (5% vs 7.5%).
        </p>
      </div>

      <form onSubmit={submit} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs items-end">
        <label className="flex flex-col gap-1">
          <span className="font-semibold text-muted-foreground">Order Side</span>
          <select value={side} onChange={(e) => setSide(e.target.value as "BUY" | "SELL")} className={input}>
            <option>BUY</option>
            <option>SELL</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold text-muted-foreground">Quantity</span>
          <input name="qty" type="number" required min={1} step={1} placeholder="100" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold text-muted-foreground">{side === "BUY" ? "Buy Rate (Rs)" : "Sell Rate (Rs)"}</span>
          <input name="rate" type="number" required min={0.01} step={0.01} placeholder="500.00" className={input} />
        </label>
        {side === "SELL" && (
          <>
            <label className="flex flex-col gap-1">
              <span className="font-semibold text-muted-foreground">Bought At (Rs)</span>
              <input name="buy_rate" type="number" required min={0} step={0.01} placeholder="420.00" className={input} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-semibold text-muted-foreground">Buy Date</span>
              <input name="buy_date" type="date" required max={today()} className={input} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-semibold text-muted-foreground">Sell Date</span>
              <input name="sell_date" type="date" required max={today()} defaultValue={today()} className={input} />
            </label>
          </>
        )}
        <label className="flex flex-col gap-1">
          <span className="font-semibold text-muted-foreground">Investor Type</span>
          <select name="investor_type" className={input}>
            <option>INDIVIDUAL</option>
            <option>INSTITUTION</option>
          </select>
        </label>
        <button className="col-span-2 sm:col-span-1 rounded-xl bg-foreground px-4 py-2.5 text-xs font-bold text-background hover:opacity-90 transition-opacity cursor-pointer shadow-xs">
          Calculate Fees
        </button>
      </form>
      {run.error && (
        <p role="alert" className="text-sm text-red-600">
          {run.error.message}
        </p>
      )}
      {r && (
        <dl className="grid max-w-md grid-cols-2 gap-x-4 text-sm">
          {Object.entries(LABELS)
            .filter(([k]) => k in r)
            .map(([k, label]) => (
              <div key={k} className="contents">
                <dt>{label}</dt>
                <dd className="text-right">{npr(String(r[k]))}</dd>
              </div>
            ))}
          {"cgt_rate" in r && (
            <>
              <dt>CGT rate</dt>
              <dd className="text-right">
                {(Number(r.cgt_rate) * 100).toFixed(1)}% ({r.long_term ? "long" : "short"}-term,{" "}
                {String(r.holding_days)} days)
              </dd>
            </>
          )}
        </dl>
      )}
    </div>
  );
}
