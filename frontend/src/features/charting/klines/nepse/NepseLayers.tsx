"use client";

import { useQuery } from "@tanstack/react-query";
import type { Chart } from "klinecharts";
import Link from "next/link";
import { useEffect } from "react";
import type { Candle } from "../../types";
import { fetchCircuitLimits, fetchCorporateActions, fetchVolumeProfile } from "./api";
import { clearLayerData, setLayerData } from "./store";

/** Loads the NEPSE layer data for a chart (painted by the NEPSE_* indicators) and links to a backtest of the symbol. */
export function NepseLayers({ chart, symbol, candles, adjusted }: { chart: Chart | null; symbol: string; candles: Candle[]; adjusted: boolean }) {
  const from = candles[0]?.time;
  const to = candles.at(-1)?.time;
  const on = !!symbol && from !== undefined && to !== undefined;
  const opts = { enabled: on, staleTime: 5 * 60_000 };
  const circuit = useQuery({ queryKey: ["nepse", "circuit", symbol, from, to, adjusted], queryFn: () => fetchCircuitLimits(symbol, from!, to!, adjusted), ...opts });
  const actions = useQuery({ queryKey: ["nepse", "actions", symbol], queryFn: () => fetchCorporateActions(symbol), ...opts });
  const profile = useQuery({ queryKey: ["nepse", "profile", symbol, from, to], queryFn: () => fetchVolumeProfile(symbol, from!, to!), ...opts });

  useEffect(() => {
    if (chart) setLayerData(chart, { circuit: on ? circuit.data ?? [] : [], actions: on ? actions.data ?? [] : [], profile: on ? profile.data ?? null : null });
  }, [chart, on, circuit.data, actions.data, profile.data]);
  useEffect(() => () => { if (chart) clearLayerData(chart); }, [chart]);

  return <Link href={`/simulator?symbol=${symbol}`} className="text-blue-700 hover:underline">Backtest this</Link>;
}
