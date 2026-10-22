import { getJson } from "@/shared/api/http";
import type { MutualFund } from "./types";

export const fetchMutualFunds = () => getJson<MutualFund[]>("/api/v1/mutual-funds");
