import { ADX } from "./adx";
import { AROON } from "./aroon";
import { ATR } from "./atr";
import { BBW } from "./bbw";
import { CMF } from "./cmf";
import { CMO } from "./cmo";
import { DEMA } from "./dema";
import { DONCHIAN } from "./donchian";
import { ENVELOPES } from "./envelopes";
import { HISTVOL } from "./histVol";
import { HMA } from "./hma";
import { ICHIMOKU } from "./ichimoku";
import type { IndicatorDef } from "./index";
import { KELTNER } from "./keltner";
import { MFI } from "./mfi";
import { PIVOTS } from "./pivots";
import { PPO } from "./ppo";
import { RVI } from "./rvi";
import { STOCH } from "./stochastic";
import { STOCHRSI } from "./stochrsi";
import { SUPERTREND } from "./supertrend";
import { TEMA } from "./tema";
import { TSI } from "./tsi";
import { VWAP } from "./vwap";
import { VWMA } from "./vwma";
import { WMA } from "./wma";

// Technical indicators that klinecharts does not ship. One file each, listed here.
export const CUSTOM_INDICATORS: IndicatorDef[] = [
  VWAP,
  HMA,
  WMA,
  DEMA,
  TEMA,
  VWMA,
  ENVELOPES,
  ICHIMOKU,
  SUPERTREND,
  KELTNER,
  DONCHIAN,
  PIVOTS,
  ATR,
  ADX,
  STOCH,
  STOCHRSI,
  MFI,
  CMF,
  AROON,
  RVI,
  TSI,
  PPO,
  CMO,
  HISTVOL,
  BBW,
];
