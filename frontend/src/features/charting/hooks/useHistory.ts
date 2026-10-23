import { useQuery } from "@tanstack/react-query";
import { fetchHistory } from "../api";
import type { Resolution } from "../types";

const DAY = 86_400;
const TEN_Y = 10 * 365 * DAY;
const RANGE: Record<Resolution, number> = {
  "1": 30 * DAY, "5": 90 * DAY, "15": 180 * DAY, "60": 365 * DAY, "1D": TEN_Y, "1W": TEN_Y, "1M": TEN_Y,
};

export function useHistory(symbol: string, adjusted: boolean, resolution: Resolution = "1D") {
  return useQuery({
    queryKey: ["udf", "history", symbol, adjusted, resolution],
    queryFn: () => {
      const to = Math.floor(Date.now() / 1000);
      return fetchHistory(symbol, to - RANGE[resolution], to, adjusted, resolution);
    },
    enabled: symbol !== "",
    staleTime: 5 * 60_000,
  });
}
