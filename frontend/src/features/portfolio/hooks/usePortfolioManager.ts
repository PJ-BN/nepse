"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addTxn as apiAddTxn, fetchHoldings as apiFetchHoldings, fetchRealized as apiFetchRealized } from "../api";
import { computeBuyFees, computeSellFees } from "../nepseFeeEngine";
import type { Holding, Realized, RealizedSell, Txn, TxnInput } from "../types";
import { useToken, setToken } from "./useToken";
import { COMPANY_CATALOG } from "../../ai/agentEngine";
import type { MarketQuote } from "../portfolioAgentEngine";

const LOCAL_TXNS_KEY = "nepse.portfolio.v2.local_txns";
const HAS_INITIALIZED_KEY = "nepse.portfolio.v2.initialized";

export const SAMPLE_TRANSACTIONS: Txn[] = [
  {
    id: "tx-1",
    symbol: "NABIL",
    txn_type: "BUY",
    qty: 120,
    rate: "482.00",
    txn_date: "2024-03-15",
    fees: { brokerage: "213.04", sebon_fee: "8.68", dp_charge: "25.00", total_fees: "246.72" },
    investor_type: "INDIVIDUAL",
    total_payable: "58086.72",
  },
  {
    id: "tx-2",
    symbol: "SHIVM",
    txn_type: "BUY",
    qty: 150,
    rate: "508.00",
    txn_date: "2024-04-10",
    fees: { brokerage: "281.96", sebon_fee: "11.43", dp_charge: "25.00", total_fees: "318.39" },
    investor_type: "INDIVIDUAL",
    total_payable: "76518.39",
  },
  {
    id: "tx-3",
    symbol: "CHCL",
    txn_type: "BUY",
    qty: 100,
    rate: "480.00",
    txn_date: "2024-05-20",
    fees: { brokerage: "177.60", sebon_fee: "7.20", dp_charge: "25.00", total_fees: "209.80" },
    investor_type: "INDIVIDUAL",
    total_payable: "48209.80",
  },
  {
    id: "tx-4",
    symbol: "UPPER",
    txn_type: "BUY",
    qty: 250,
    rate: "234.00",
    txn_date: "2024-06-02",
    fees: { brokerage: "216.45", sebon_fee: "8.78", dp_charge: "25.00", total_fees: "250.23" },
    investor_type: "INDIVIDUAL",
    total_payable: "58750.23",
  },
  {
    id: "tx-5",
    symbol: "HDL",
    txn_type: "BUY",
    qty: 40,
    rate: "1345.00",
    txn_date: "2024-07-12",
    fees: { brokerage: "199.06", sebon_fee: "8.07", dp_charge: "25.00", total_fees: "232.13" },
    investor_type: "INDIVIDUAL",
    total_payable: "54032.13",
  },
];

export function usePortfolioManager() {
  const token = useToken();
  const qc = useQueryClient();
  const isCloud = Boolean(token);

  // Local storage state
  const [localTxns, setLocalTxns] = useState<Txn[]>([]);
  const [localRealized, setLocalRealized] = useState<Realized>({
    total_realized_pnl: "0.00",
    total_cgt: "0.00",
    sells: [],
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedTxns = localStorage.getItem(LOCAL_TXNS_KEY);
      const isInit = localStorage.getItem(HAS_INITIALIZED_KEY);

      if (storedTxns) {
        setLocalTxns(JSON.parse(storedTxns));
      } else if (!isInit) {
        // Load default sample portfolio on first visit so user immediately sees holdings & AI
        setLocalTxns(SAMPLE_TRANSACTIONS);
        localStorage.setItem(LOCAL_TXNS_KEY, JSON.stringify(SAMPLE_TRANSACTIONS));
        localStorage.setItem(HAS_INITIALIZED_KEY, "true");
      }
    } catch {
      // Ignore localStorage errors
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Sync to localStorage
  const saveLocalTxns = useCallback((txns: Txn[]) => {
    setLocalTxns(txns);
    try {
      localStorage.setItem(LOCAL_TXNS_KEY, JSON.stringify(txns));
    } catch {}
  }, []);

  // Fetch live market summary to get up-to-date LTPs for NEPSE symbols
  const { data: marketData } = useQuery({
    queryKey: ["portfolio-market-quotes"],
    queryFn: async () => {
      const res = await fetch("/api/v1/market/summary");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  const quotesMap = useMemo<Record<string, MarketQuote>>(() => {
    const map: Record<string, MarketQuote> = {};
    if (marketData && Array.isArray(marketData.quotes)) {
      for (const q of marketData.quotes) {
        if (q && q.symbol) {
          map[q.symbol.toUpperCase()] = {
            symbol: q.symbol.toUpperCase(),
            ltp: Number(q.ltp || 0),
            pct_change: Number(q.pct_change || 0),
            volume: Number(q.volume || 0),
            turnover: Number(q.turnover || 0),
          };
        }
      }
    }
    return map;
  }, [marketData]);

  // Compute local holdings and WACC from localTxns
  const localHoldings = useMemo<Holding[]>(() => {
    const map = new Map<
      string,
      {
        symbol: string;
        qty: number;
        totalCost: number;
      }
    >();

    const sells: RealizedSell[] = [];
    let totalRealizedPnl = 0;
    let totalCgt = 0;

    for (const t of localTxns) {
      const sym = t.symbol.toUpperCase();
      const current = map.get(sym) || { symbol: sym, qty: 0, totalCost: 0 };
      const rate = Number(t.rate || 0);
      const qty = Number(t.qty || 0);

      if (t.txn_type === "BUY" || t.txn_type === "IPO" || t.txn_type === "RIGHT") {
        const fees = computeBuyFees(qty, rate, t.txn_type === "IPO");
        const payable = fees.total_payable ?? qty * rate;
        current.qty += qty;
        current.totalCost += payable;
        map.set(sym, current);
      } else if (t.txn_type === "BONUS") {
        current.qty += qty;
        map.set(sym, current);
      } else if (t.txn_type === "SELL") {
        const currentWacc = current.qty > 0 ? current.totalCost / current.qty : rate;
        const sellResult = computeSellFees(qty, rate, currentWacc, 180, t.investor_type || "INDIVIDUAL");

        // Reduce holding
        current.qty = Math.max(0, current.qty - qty);
        current.totalCost = Math.max(0, current.qty * currentWacc);
        map.set(sym, current);

        totalRealizedPnl += sellResult.realized_pnl ?? 0;
        totalCgt += sellResult.cgt ?? 0;

        sells.push({
          symbol: sym,
          sell_date: t.txn_date,
          qty,
          rate: rate.toFixed(2),
          amount: sellResult.amount.toFixed(2),
          total_fees: sellResult.total_fees.toFixed(2),
          cost_basis: (qty * currentWacc).toFixed(2),
          cgt: (sellResult.cgt ?? 0).toFixed(2),
          net_receivable: (sellResult.net_receivable ?? 0).toFixed(2),
          realized_pnl: (sellResult.realized_pnl ?? 0).toFixed(2),
        });
      }
    }

    setLocalRealized({
      total_realized_pnl: totalRealizedPnl.toFixed(2),
      total_cgt: totalCgt.toFixed(2),
      sells,
    });

    const list: Holding[] = [];
    for (const [sym, val] of map.entries()) {
      if (val.qty <= 0) continue;
      const wacc = val.totalCost / val.qty;
      const quote = quotesMap[sym];
      const ltp = quote?.ltp ?? wacc;
      const marketVal = ltp * val.qty;
      const unPnl = marketVal - val.totalCost;
      const unPnlPct = val.totalCost > 0 ? (unPnl / val.totalCost) * 100 : 0;
      const meta = COMPANY_CATALOG[sym];

      list.push({
        symbol: sym,
        name: meta?.name || sym,
        sector: meta?.sector || "Equities",
        qty: val.qty,
        wacc: wacc.toFixed(2),
        total_cost: val.totalCost.toFixed(2),
        ltp: ltp.toFixed(2),
        market_value: marketVal.toFixed(2),
        unrealized_pnl: unPnl.toFixed(2),
        unrealized_pnl_pct: unPnlPct,
        day_change: quote?.pct_change != null ? ((ltp * quote.pct_change) / 100).toFixed(2) : "0.00",
        day_change_pct: quote?.pct_change ?? 0,
      });
    }

    // Compute portfolio weights
    const totalVal = list.reduce((sum, h) => sum + Number(h.market_value), 0);
    list.forEach((h) => {
      h.weight_pct = totalVal > 0 ? (Number(h.market_value) / totalVal) * 100 : 0;
    });

    return list;
  }, [localTxns, quotesMap]);

  // Backend queries when logged in (token present)
  const { data: cloudHoldings, isLoading: cloudHoldingsLoading } = useQuery({
    queryKey: ["portfolio", token, "holdings"],
    queryFn: () => apiFetchHoldings(token!),
    enabled: Boolean(token),
  });

  const { data: cloudRealized, isLoading: cloudRealizedLoading } = useQuery({
    queryKey: ["portfolio", token, "realized"],
    queryFn: () => apiFetchRealized(token!),
    enabled: Boolean(token),
  });

  const cloudAddMutation = useMutation({
    mutationFn: (txn: TxnInput) => apiAddTxn(token!, txn),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolio", token] });
    },
  });

  // Effective active holdings and realized data
  const holdings: Holding[] = useMemo(() => {
    if (isCloud && cloudHoldings) {
      return cloudHoldings.map((h) => {
        const sym = h.symbol.toUpperCase();
        const quote = quotesMap[sym];
        const wacc = Number(h.wacc);
        const ltp = Number(h.ltp || quote?.ltp || wacc);
        const meta = COMPANY_CATALOG[sym];
        const qty = Number(h.qty);
        const totalCost = Number(h.total_cost || wacc * qty);
        const marketValue = Number(h.market_value || ltp * qty);
        const unPnl = Number(h.unrealized_pnl || marketValue - totalCost);
        const unPnlPct = totalCost > 0 ? (unPnl / totalCost) * 100 : 0;

        return {
          ...h,
          name: meta?.name || sym,
          sector: meta?.sector || "Equities",
          ltp: ltp.toFixed(2),
          market_value: marketValue.toFixed(2),
          unrealized_pnl: unPnl.toFixed(2),
          unrealized_pnl_pct: unPnlPct,
          day_change: quote?.pct_change != null ? ((ltp * quote.pct_change) / 100).toFixed(2) : h.day_change,
          day_change_pct: quote?.pct_change ?? 0,
        };
      });
    }
    return localHoldings;
  }, [isCloud, cloudHoldings, localHoldings, quotesMap]);

  const realized: Realized = isCloud && cloudRealized ? cloudRealized : localRealized;

  // Aggregate Portfolio Performance Summary
  const summary = useMemo(() => {
    const totalCost = holdings.reduce((sum, h) => sum + Number(h.total_cost || 0), 0);
    const marketValue = holdings.reduce((sum, h) => sum + Number(h.market_value || 0), 0);
    const unrealizedPnl = marketValue - totalCost;
    const unrealizedPnlPct = totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : 0;

    let dayChangeTotal = 0;
    holdings.forEach((h) => {
      const dc = Number(h.day_change || 0);
      dayChangeTotal += dc * Number(h.qty || 1);
    });
    const dayChangePct = marketValue > 0 ? (dayChangeTotal / marketValue) * 100 : 0;

    const sortedByPnl = [...holdings].sort((a, b) => (b.unrealized_pnl_pct || 0) - (a.unrealized_pnl_pct || 0));
    const topGainer = sortedByPnl[0];
    const topLoser = sortedByPnl[sortedByPnl.length - 1];

    return {
      totalCost,
      marketValue,
      unrealizedPnl,
      unrealizedPnlPct,
      dayChange: dayChangeTotal,
      dayChangePct,
      holdingsCount: holdings.length,
      topGainer,
      topLoser,
    };
  }, [holdings]);

  // Actions
  const addTransaction = useCallback(
    async (input: TxnInput) => {
      if (isCloud) {
        await cloudAddMutation.mutateAsync(input);
      } else {
        const fees =
          input.txn_type === "SELL"
            ? computeSellFees(input.qty, Number(input.rate || 0), Number(input.rate || 0), 180, input.investor_type)
            : computeBuyFees(input.qty, Number(input.rate || 0), input.txn_type === "IPO");

        const newTxn: Txn = {
          id: `tx-${Date.now()}`,
          symbol: input.symbol.toUpperCase(),
          txn_type: input.txn_type,
          qty: input.qty,
          rate: input.rate || "100.00",
          txn_date: input.txn_date,
          investor_type: input.investor_type,
          fees: {
            brokerage: fees.brokerage.toFixed(2),
            sebon_fee: fees.sebon_fee.toFixed(2),
            dp_charge: fees.dp_charge.toFixed(2),
            total_fees: fees.total_fees.toFixed(2),
          },
          total_payable: fees.total_payable?.toFixed(2),
          net_receivable: fees.net_receivable?.toFixed(2),
        };

        saveLocalTxns([newTxn, ...localTxns]);
      }
    },
    [isCloud, cloudAddMutation, localTxns, saveLocalTxns]
  );

  const removeHolding = useCallback(
    (symbol: string) => {
      const sym = symbol.toUpperCase();
      const filtered = localTxns.filter((t) => t.symbol.toUpperCase() !== sym);
      saveLocalTxns(filtered);
    },
    [localTxns, saveLocalTxns]
  );

  const deleteTransaction = useCallback(
    (id: string | number) => {
      const filtered = localTxns.filter((t) => t.id !== id);
      saveLocalTxns(filtered);
    },
    [localTxns, saveLocalTxns]
  );

  const loadSamplePortfolio = useCallback(() => {
    saveLocalTxns(SAMPLE_TRANSACTIONS);
  }, [saveLocalTxns]);

  const clearPortfolio = useCallback(() => {
    saveLocalTxns([]);
  }, [saveLocalTxns]);

  const logout = useCallback(() => {
    setToken(null);
  }, []);

  return {
    isCloud,
    isLoaded,
    holdings,
    transactions: localTxns,
    realized,
    summary,
    quotesMap,
    addTransaction,
    removeHolding,
    deleteTransaction,
    loadSamplePortfolio,
    clearPortfolio,
    logout,
    isLoading: isCloud ? cloudHoldingsLoading || cloudRealizedLoading : !isLoaded,
  };
}
