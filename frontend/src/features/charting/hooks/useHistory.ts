import { useQuery } from "@tanstack/react-query";
import { fetchHistory } from "../api";
import type { Resolution } from "../types";

const DAY = 86_400;
const RANGE: Record<Resolution, number> = { "1": 7 * DAY, "5": 30 * DAY, "15": 30 * DAY, "60": 90 * DAY, "1D": 10 * 365 * DAY };

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
