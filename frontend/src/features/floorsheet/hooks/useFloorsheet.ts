import { useQuery } from "@tanstack/react-query";
import { fetchAccumulation, fetchAnalytics, fetchWhales } from "../api";

export const useBrokerAnalytics = (symbol: string, days: number, brokerNo?: number) =>
  useQuery({
    queryKey: ["floorsheet", "analytics", symbol, days, brokerNo],
    queryFn: () => fetchAnalytics(symbol, days, brokerNo),
    enabled: symbol.length > 0,
  });

export const useWhales = (symbol?: string) =>
  useQuery({ queryKey: ["floorsheet", "whales", symbol], queryFn: () => fetchWhales(symbol), refetchInterval: 30_000 });

export const useAccumulation = () =>
  useQuery({ queryKey: ["floorsheet", "accumulation"], queryFn: fetchAccumulation });
