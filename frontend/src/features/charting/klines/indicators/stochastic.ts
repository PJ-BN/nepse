import { stochastic } from "../../indicators";
import { hlcv, lineIndicator } from "./util";

export const STOCH = lineIndicator({
  name: "STOCH",
  label: "Stochastic",
  main: false,
  calcParams: [14, 3, 3],
  lines: [
    { key: "k", title: "%K", color: "#2962ff" },
    { key: "d", title: "%D", color: "#ff9800" },
  ],
  calc: (d, [period, smooth, dPeriod]) => {
    const { h, l, c } = hlcv(d);
    return stochastic(h, l, c, period, smooth, dPeriod);
  },
});
