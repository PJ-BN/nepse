import { useQuery } from "@tanstack/react-query";
import { fetchHistory } from "../api";

const TEN_YEARS = 10 * 365 * 86_400;

export function useHistory(symbol: string, adjusted: boolean) {
  return useQuery({
    queryKey: ["udf", "history", symbol, adjusted],
    queryFn: () => {
      const to = Math.floor(Date.now() / 1000);
      return fetchHistory(symbol, to - TEN_YEARS, to, adjusted);
    },
    enabled: symbol !== "",
    staleTime: 5 * 60_000,
  });
}
