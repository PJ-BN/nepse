"use client";

import { useState, useEffect, type FormEvent } from "react";
import { createPortal } from "react-dom";
import type { InvestorType, TxnInput, TxnType } from "../types";
import { computeBuyFees, computeSellFees } from "../nepseFeeEngine";
import { today, npr } from "./format";

export function TxnModal({
  isOpen,
  onClose,
  onSubmit,
  prefill,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (txn: TxnInput) => Promise<void>;
  prefill?: { symbol: string; type: TxnType; rate?: string; qty?: number };
}) {
  const [mounted, setMounted] = useState(false);
  const [type, setType] = useState<TxnType>("BUY");
  const [symbol, setSymbol] = useState("");
  const [qty, setQty] = useState<number>(100);
  const [rate, setRate] = useState<string>("100.00");
  const [date, setDate] = useState(today());
  const [investorType, setInvestorType] = useState<InvestorType>("INDIVIDUAL");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (prefill) {
      if (prefill.symbol) setSymbol(prefill.symbol);
      if (prefill.type) setType(prefill.type);
      if (prefill.rate) setRate(prefill.rate);
      if (prefill.qty) setQty(prefill.qty);
    }
  }, [prefill, isOpen]);

  if (!isOpen || !mounted) return null;

  const isBonus = type === "BONUS";
  const numRate = Number(rate || 0);
  const feeEstimate =
    type === "SELL"
      ? computeSellFees(qty, numRate, numRate * 0.9, 180, investorType)
      : computeBuyFees(qty, numRate, type === "IPO");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!symbol.trim()) {
      setError("Symbol is required");
      return;
    }
    if (qty <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        symbol: symbol.trim().toUpperCase(),
        txn_type: type,
        qty: Number(qty),
        rate: isBonus ? undefined : rate,
        txn_date: date,
        investor_type: investorType,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record transaction");
    } finally {
      setIsSubmitting(false);
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 sm:p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary font-bold">
              +
            </span>
            <div>
              <h2 className="text-lg font-bold text-foreground">Record Transaction</h2>
              <p className="text-xs text-muted-foreground">Add buy, sell, bonus, right or IPO entries</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Transaction Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Transaction Type
            </label>
            <div className="grid grid-cols-5 gap-1.5 rounded-xl bg-surface p-1 border border-border/70">
              {(["BUY", "SELL", "BONUS", "RIGHT", "IPO"] as TxnType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-lg py-1.5 text-xs font-bold transition-all ${
                    type === t
                      ? t === "BUY"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : t === "SELL"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-foreground text-background shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Symbol */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Stock Symbol</label>
              <input
                type="text"
                required
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. NABIL, UPPER"
                className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm uppercase font-mono font-bold text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
              />
            </div>

            {/* Units / Quantity */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Units (Quantity)</label>
              <input
                type="number"
                required
                min={1}
                step={1}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm font-mono text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
              />
            </div>
          </div>

          {!isBonus && (
            <div className="grid grid-cols-2 gap-4">
              {/* Purchase/Sell Rate */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Rate (NPR per unit)</label>
                <input
                  type="number"
                  required
                  min={0.01}
                  step={0.01}
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm font-mono text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              {/* Transaction Date */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Date</label>
                <input
                  type="date"
                  required
                  max={today()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Investor Type */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Investor Profile</label>
            <select
              value={investorType}
              onChange={(e) => setInvestorType(e.target.value as InvestorType)}
              className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
            >
              <option value="INDIVIDUAL">Individual (Individual CGT slabs)</option>
              <option value="INSTITUTION">Institution (10% CGT rate)</option>
            </select>
          </div>

          {/* Fee & Payable Preview */}
          {!isBonus && (
            <div className="rounded-2xl border border-border/60 bg-surface p-3.5 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-muted-foreground">
                <span>Base Amount ({qty} × {rate}):</span>
                <span>Rs. {npr(feeEstimate.amount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>NEPSE Broker + SEBON + DP Fees:</span>
                <span>Rs. {npr(feeEstimate.total_fees)}</span>
              </div>
              <div className="border-t border-border/60 pt-1 flex justify-between font-bold text-foreground text-sm">
                <span>{type === "SELL" ? "Est. Net Receivable:" : "Total Payable (WACC Basis):"}</span>
                <span className={type === "SELL" ? "text-emerald-600 dark:text-emerald-400" : "text-primary"}>
                  Rs. {npr(type === "SELL" ? feeEstimate.net_receivable : feeEstimate.total_payable)}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border/80 bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isSubmitting ? "Recording…" : "Save Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
