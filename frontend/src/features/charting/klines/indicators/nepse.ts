import type { IndicatorDef } from "./index";
import { ACTIONS, CIRCUIT, VOLUME_PROFILE } from "../nepse/layers";

// NEPSE-specific layers: ±10% circuit lines, bonus/dividend/right markers, floorsheet volume profile.
// They paint from data NepseLayers loads per chart (klines/nepse/store.ts).
export const NEPSE_INDICATORS: IndicatorDef[] = [CIRCUIT, ACTIONS, VOLUME_PROFILE];
