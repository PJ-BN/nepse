import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCompanyFull, refreshCompany } from "../api";

export const useCompanyFull = (symbol: string) =>
  useQuery({ queryKey: ["company", symbol], queryFn: () => fetchCompanyFull(symbol) });

export function useRefreshCompany(symbol: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => refreshCompany(symbol),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company", symbol] }),
  });
}
