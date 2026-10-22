"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addTxn, fetchHoldings, fetchRealized } from "../api";
import type { TxnInput } from "../types";
import { setToken } from "./useToken";

// getJson errors read "401 Unauthorized on ..."; an expired token logs the user out.
const logoutOn401 = (e: unknown) => {
  if (e instanceof Error && e.message.startsWith("401")) setToken(null);
  return false;
};

export function useHoldings(token: string) {
  return useQuery({ queryKey: ["portfolio", token, "holdings"], queryFn: () => fetchHoldings(token), retry: logoutOn401 });
}

export function useRealized(token: string) {
  return useQuery({ queryKey: ["portfolio", token, "realized"], queryFn: () => fetchRealized(token), retry: logoutOn401 });
}

export function useAddTxn(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (txn: TxnInput) => addTxn(token, txn),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio", token] }),
  });
}
