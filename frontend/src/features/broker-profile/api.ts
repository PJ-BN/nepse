import { getJson } from "@/shared/api/http";
import type { BrokerProfile } from "./types";

export const fetchBrokerProfile = (broker: number) => getJson<BrokerProfile>(`/api/v1/floorsheet/broker/${broker}`);
