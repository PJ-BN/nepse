import { useQuery } from "@tanstack/react-query";
import { fetchMutualFunds } from "../api";

export const useMutualFunds = () => useQuery({ queryKey: ["mutual-funds"], queryFn: fetchMutualFunds });
