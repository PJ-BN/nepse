import { wma } from "../../indicators";
import { hlcv, lineIndicator } from "./util";

export const WMA = lineIndicator({
  name: "WMA",
  label: "Weighted Moving Average",
  main: true,
  calcParams: [20],
  lines: [{ key: "wma", title: "WMA", color: "#ec4899" }],
  calc: (d, [period]) => {
    const { c } = hlcv(d);
    return { wma: wma(c, period) };
  },
});
