import { useQuery } from "@tanstack/react-query";
import { fetchAnnouncements, fetchBookClosures, fetchDividends, fetchRights } from "../api";

export const useDividends = (symbol?: string) =>
  useQuery({ queryKey: ["calendar", "dividends", symbol], queryFn: () => fetchDividends(symbol) });
export const useRights = (symbol?: string) =>
  useQuery({ queryKey: ["calendar", "rights", symbol], queryFn: () => fetchRights(symbol) });
export const useBookClosures = (days = 60) =>
  useQuery({ queryKey: ["calendar", "closures", days], queryFn: () => fetchBookClosures(days) });
export const useAnnouncements = (limit = 50) =>
  useQuery({
    queryKey: ["calendar", "announcements", limit],
    queryFn: () => fetchAnnouncements(limit),
    refetchInterval: 10 * 60_000,
  });
