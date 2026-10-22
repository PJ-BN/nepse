import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchPresets, runScreener } from "../api";
import type { ScreenerRequest } from "../types";

export const usePresets = () => useQuery({ queryKey: ["screener", "presets"], queryFn: fetchPresets });

export const useScreenerRun = (req: ScreenerRequest) =>
  useQuery({
    queryKey: ["screener", "run", req],
    queryFn: () => runScreener(req),
    placeholderData: keepPreviousData,
    retry: false, // a 422 from a bad filter will not fix itself
  });
