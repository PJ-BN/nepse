import { useQuery } from "@tanstack/react-query";
import { fetchBreadth, fetchIpoPipeline, fetchRadar, fetchRrg } from "../api";
import type { Rrg } from "../types";

export const useRadar = (days = 365) => useQuery({ queryKey: ["macro", "radar", days], queryFn: () => fetchRadar(days) });

export const useRrg = (timeframe: Rrg["timeframe"], tail: number) =>
  useQuery({ queryKey: ["macro", "rrg", timeframe, tail], queryFn: () => fetchRrg(timeframe, tail) });

export const useIpoPipeline = () => useQuery({ queryKey: ["macro", "ipo"], queryFn: fetchIpoPipeline });

export const useBreadth = () =>
  useQuery({ queryKey: ["breadth"], queryFn: fetchBreadth, refetchInterval: 60_000, retry: false });
