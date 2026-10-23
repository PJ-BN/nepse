import { useMutation } from "@tanstack/react-query";
import { runSimulation } from "../api";

// A mutation, not a query: a run is an explicit button press and the response is large.
export const useSimulation = () => useMutation({ mutationFn: runSimulation });
