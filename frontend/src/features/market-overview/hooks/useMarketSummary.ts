import { useQuery } from "@tanstack/react-query";
import { useLiveIndices, useLiveQuotes, useLiveStatus } from "@/features/live-feed";
import { fetchMarketSummary } from "../api";
import type { IndexValue, Quote } from "../types";

/**
 * The REST summary, with live socket values laid over its rows. Membership of the mover lists
 * only changes on refetch (every 30s while the market is open).
 */
export function useMarketSummary() {
  const live = useLiveQuotes();
  const liveIdx = useLiveIndices();
  const liveStatus = useLiveStatus();
  const query = useQuery({
    queryKey: ["market", "summary"],
    queryFn: fetchMarketSummary,
    refetchInterval: (q) => ((liveStatus ?? q.state.data?.status) === "OPEN" ? 30_000 : false),
  });
  const s = query.data;
  if (!s) return { ...query, summary: undefined };

  const q = (x: Quote): Quote => ({ ...x, ...live[x.symbol] });
  const i = (x: IndexValue): IndexValue => ({ ...x, ...liveIdx[x.code] });
  return {
    ...query,
    summary: {
      ...s,
      status: liveStatus ?? s.status,
      index: s.index && i(s.index),
      sub_indices: s.sub_indices.map(i),
      gainers: s.gainers.map(q),
      losers: s.losers.map(q),
      top_turnover: s.top_turnover.map(q),
      quotes: s.quotes.map(q),
    },
  };
}
