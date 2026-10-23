import { hma } from "../../indicators";
import { hlcv, lineIndicator } from "./util";

export const HMA = lineIndicator({
  name: "HMA",
  label: "Hull Moving Average",
  main: true,
  calcParams: [9],
  lines: [{ key: "hma", title: "HMA", color: "#8b5cf6" }],
  calc: (d, [period]) => {
    const { c } = hlcv(d);
    return { hma: hma(c, period) };
  },
});
