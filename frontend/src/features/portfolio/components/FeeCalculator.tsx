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
const input = "rounded border px-2 py-1";

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
    <div className="flex flex-col gap-3">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col">
          Side
          <select value={side} onChange={(e) => setSide(e.target.value as "BUY" | "SELL")} className={input}>
            <option>BUY</option>
            <option>SELL</option>
          </select>
        </label>
        <label className="flex flex-col">
          Qty
          <input name="qty" type="number" required min={1} step={1} className={`${input} w-24`} />
        </label>
        <label className="flex flex-col">
          {side === "BUY" ? "Buy rate" : "Sell rate"}
          <input name="rate" type="number" required min={0.01} step={0.01} className={`${input} w-28`} />
        </label>
        {side === "SELL" && (
          <>
            <label className="flex flex-col">
              Bought at
              <input name="buy_rate" type="number" required min={0} step={0.01} className={`${input} w-28`} />
            </label>
            <label className="flex flex-col">
              Buy date
              <input name="buy_date" type="date" required max={today()} className={input} />
            </label>
            <label className="flex flex-col">
              Sell date
              <input name="sell_date" type="date" required max={today()} defaultValue={today()} className={input} />
            </label>
          </>
        )}
        <label className="flex flex-col">
          Investor
          <select name="investor_type" className={input}>
            <option>INDIVIDUAL</option>
            <option>INSTITUTION</option>
          </select>
        </label>
        <button className="rounded bg-black px-3 py-1 text-white dark:bg-white dark:text-black">Calculate</button>
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
