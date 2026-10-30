import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMarketAiAnalysis } from "../api";
import type { MarketAiAnalysis } from "../types";

export function useMarketAi(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();

  const query = useQuery<MarketAiAnalysis>({
    queryKey: ["ai-market"],
    queryFn: () => fetchMarketAiAnalysis(),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  });

  const refreshMutation = useMutation({
    mutationFn: () => fetchMarketAiAnalysis(true),
    onSuccess: (data) => {
      queryClient.setQueryData(["ai-market"], data);
    },
  });

  return {
    ...query,
    refreshAi: refreshMutation.mutate,
    refreshAiAsync: refreshMutation.mutateAsync,
    isRefreshing: refreshMutation.isPending,
  };
}
