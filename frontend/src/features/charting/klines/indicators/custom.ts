import { ADX } from "./adx";
import { ATR } from "./atr";
import { DONCHIAN } from "./donchian";
import { ICHIMOKU } from "./ichimoku";
import type { IndicatorDef } from "./index";
import { KELTNER } from "./keltner";
import { PIVOTS } from "./pivots";
import { STOCH } from "./stochastic";
import { STOCHRSI } from "./stochrsi";
import { SUPERTREND } from "./supertrend";
import { VWAP } from "./vwap";

// Technical indicators that klinecharts does not ship. One file each, listed here.
export const CUSTOM_INDICATORS: IndicatorDef[] = [VWAP, ICHIMOKU, SUPERTREND, KELTNER, DONCHIAN, PIVOTS, ATR, ADX, STOCH, STOCHRSI];
