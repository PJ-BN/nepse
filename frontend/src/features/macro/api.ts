import { getJson } from "@/shared/api/http";
import type { Breadth, Issue, MacroRadar, Rrg } from "./types";

export const fetchRadar = (days = 365) => getJson<MacroRadar>(`/api/v1/macro/radar?days=${days}`);
export const fetchRrg = (timeframe: Rrg["timeframe"], tail: number) =>
  getJson<Rrg>(`/api/v1/macro/rrg?timeframe=${timeframe}&tail=${tail}`);
export const fetchIpoPipeline = () => getJson<Issue[]>("/api/v1/macro/ipo-pipeline");
export const fetchBreadth = () => getJson<Breadth>("/api/v1/breadth");
