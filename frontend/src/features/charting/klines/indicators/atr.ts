import { atr } from "../../indicators";
import { hlcv, lineIndicator } from "./util";

export const ATR = lineIndicator({
  name: "ATR",
  label: "ATR",
  main: false,
  calcParams: [14],
  lines: [{ key: "atr", title: "ATR", color: "#ff9800" }],
  calc: (d, [period]) => {
    const { h, l, c } = hlcv(d);
    return { atr: atr(h, l, c, period) };
  },
});
