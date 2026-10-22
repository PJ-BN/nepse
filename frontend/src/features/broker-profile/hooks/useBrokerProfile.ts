import { useQuery } from "@tanstack/react-query";
import { fetchBrokerProfile } from "../api";

export const useBrokerProfile = (broker: number) =>
  useQuery({ queryKey: ["broker-profile", broker], queryFn: () => fetchBrokerProfile(broker) });
