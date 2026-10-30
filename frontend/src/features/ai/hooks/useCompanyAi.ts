import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCompanyAiEvaluation } from "../api";
import type { CompanyAiEvaluation } from "../types";

export function useCompanyAi(symbol: string, options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();
  const upper = symbol.toUpperCase().trim();

  const query = useQuery<CompanyAiEvaluation>({
    queryKey: ["ai-company", upper],
    queryFn: () => fetchCompanyAiEvaluation(upper),
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    refetchOnWindowFocus: false,
    enabled: Boolean(symbol) && (options?.enabled ?? true),
  });

  const refreshMutation = useMutation({
    mutationFn: () => fetchCompanyAiEvaluation(upper, true),
    onSuccess: (data) => {
      queryClient.setQueryData(["ai-company", upper], data);
    },
  });

  return {
    ...query,
    refreshAi: refreshMutation.mutate,
    refreshAiAsync: refreshMutation.mutateAsync,
    isRefreshing: refreshMutation.isPending,
  };
}
