import { getJson } from "@/shared/api/http";
import type { SimulationRequest, SimulationResult } from "./types";

export const runSimulation = (req: SimulationRequest) =>
  getJson<SimulationResult>("/api/v1/simulation/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
