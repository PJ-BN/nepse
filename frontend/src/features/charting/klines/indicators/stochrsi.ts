import { stochRsi } from "../../indicators";
import { hlcv, lineIndicator } from "./util";

export const STOCHRSI = lineIndicator({
  name: "STOCHRSI",
  label: "Stoch RSI",
  main: false,
  calcParams: [14, 14, 3, 3],
  lines: [
    { key: "k", title: "%K", color: "#2962ff" },
    { key: "d", title: "%D", color: "#ff9800" },
  ],
  calc: (d, [rsiPeriod, period, k, dd]) => stochRsi(hlcv(d).c, rsiPeriod, period, k, dd),
});
