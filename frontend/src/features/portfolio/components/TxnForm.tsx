"use client";

import { useState, type FormEvent } from "react";
import { useAddTxn } from "../hooks/usePortfolio";
import type { InvestorType, TxnType } from "../types";
import { today } from "./format";

const TYPES: TxnType[] = ["BUY", "SELL", "BONUS", "RIGHT", "IPO"];
const input = "rounded border px-2 py-1";

export function TxnForm({ token }: { token: string }) {
  const add = useAddTxn(token);
  const [type, setType] = useState<TxnType>("BUY");
  const market = type === "BUY" || type === "SELL";

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const rate = String(f.get("rate") ?? "");
    add.mutate(
      {
        symbol: String(f.get("symbol")).trim().toUpperCase(),
        txn_type: type,
        qty: Number(f.get("qty")),
        rate: type === "BONUS" || rate === "" ? undefined : rate,
        txn_date: String(f.get("txn_date")),
        investor_type: String(f.get("investor_type")) as InvestorType,
      },
      { onSuccess: () => form.reset() },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 text-sm">
      <label className="flex flex-col">
        Type
        <select value={type} onChange={(e) => setType(e.target.value as TxnType)} className={input}>
          {TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col">
        Symbol
        <input name="symbol" required pattern="[A-Za-z0-9]{1,20}" className={`${input} w-28 uppercase`} />
      </label>
      <label className="flex flex-col">
        Qty
        <input name="qty" type="number" required min={1} step={1} className={`${input} w-24`} />
      </label>
      {type !== "BONUS" && (
        <label className="flex flex-col">
          Rate
          <input
            name="rate"
            type="number"
            min={market ? 0.01 : 0}
            step={0.01}
            required={market}
            placeholder={market ? "" : "100"}
            className={`${input} w-28`}
          />
        </label>
      )}
      <label className="flex flex-col">
        Date
        <input name="txn_date" type="date" required max={today()} defaultValue={today()} className={input} />
      </label>
      <label className="flex flex-col">
        Investor
        <select name="investor_type" className={input}>
          <option>INDIVIDUAL</option>
          <option>INSTITUTION</option>
        </select>
      </label>
      <button
        disabled={add.isPending}
        className="rounded bg-black px-3 py-1 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        Add
      </button>
      {add.error && (
        <p role="alert" className="w-full text-red-600">
          {add.error.message}
        </p>
      )}
    </form>
  );
}
