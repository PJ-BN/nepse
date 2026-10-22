import { getJson } from "@/shared/api/http";
import type { Announcement, DividendEvent } from "./types";

const q = (symbol?: string) => (symbol ? `?symbol=${encodeURIComponent(symbol)}` : "");

export const fetchDividends = (symbol?: string) => getJson<DividendEvent[]>(`/api/v1/calendar/dividends${q(symbol)}`);
export const fetchRights = (symbol?: string) => getJson<DividendEvent[]>(`/api/v1/calendar/rights${q(symbol)}`);
export const fetchBookClosures = (days = 60) => getJson<DividendEvent[]>(`/api/v1/calendar/book-closures?days=${days}`);
export const fetchAnnouncements = (limit = 50) => getJson<Announcement[]>(`/api/v1/calendar/announcements?limit=${limit}`);
