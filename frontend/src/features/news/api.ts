import { getJson, postJson } from "@/shared/api/http";
import type { NewsAiEvaluation, NewsBriefing, NewsFeedResponse, NewsFilterState, NewsItem } from "./types";

export async function fetchNews(filters: Partial<NewsFilterState> = {}): Promise<NewsFeedResponse> {
  const params = new URLSearchParams();
  if (filters.category && filters.category !== "all") {
    params.set("category", filters.category);
  }
  if (filters.symbol) {
    params.set("symbol", filters.symbol);
  }
  if (filters.search) {
    params.set("search", filters.search);
  }
  if (filters.stance && filters.stance !== "ALL") {
    params.set("stance", filters.stance);
  }
  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }
  if (filters.page && filters.limit) {
    params.set("offset", String((filters.page - 1) * filters.limit));
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  return getJson<NewsFeedResponse>(`/api/v1/news${query}`);
}

export async function fetchCompanyNews(symbol: string, limit = 10): Promise<NewsItem[]> {
  return getJson<NewsItem[]>(`/api/v1/news/company/${encodeURIComponent(symbol.toUpperCase())}?limit=${limit}`);
}

export async function fetchNewsBriefing(): Promise<NewsBriefing> {
  return getJson<NewsBriefing>("/api/v1/news/briefing/latest");
}

export async function fetchNewsDetail(id: number): Promise<NewsItem> {
  return getJson<NewsItem>(`/api/v1/news/${id}`);
}

export async function evaluateNewsAi(newsItem: NewsItem, forceRefresh = false): Promise<NewsAiEvaluation> {
  return postJson<NewsAiEvaluation>(
    `/api/ai/news/${newsItem.id}${forceRefresh ? "?refresh=true" : ""}`,
    newsItem
  );
}
