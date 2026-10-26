"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { evaluateNewsAi, fetchCompanyNews, fetchNews, fetchNewsBriefing } from "../api";
import type { NewsFilterState, NewsItem } from "../types";

export function useNews(filters: Partial<NewsFilterState> = {}) {
  return useQuery({
    queryKey: ["news", filters],
    queryFn: () => fetchNews(filters),
    staleTime: 30_000,
  });
}

export function useCompanyNews(symbol: string, limit = 10) {
  return useQuery({
    queryKey: ["news", "company", symbol.toUpperCase(), limit],
    queryFn: () => fetchCompanyNews(symbol, limit),
    enabled: Boolean(symbol),
    staleTime: 60_000,
  });
}

export function useNewsBriefing() {
  return useQuery({
    queryKey: ["news", "briefing"],
    queryFn: fetchNewsBriefing,
    staleTime: 60_000,
  });
}

export function useAnalyzeNews() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (newsItem: NewsItem) => evaluateNewsAi(newsItem, true),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["news"] });
      return data;
    },
  });
}
