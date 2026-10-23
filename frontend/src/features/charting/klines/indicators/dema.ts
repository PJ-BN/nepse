import { dema } from "../../indicators";
import { hlcv, lineIndicator } from "./util";

export const DEMA = lineIndicator({
  name: "DEMA",
  label: "Double Exponential Moving Average",
  main: true,
  calcParams: [20],
  lines: [{ key: "dema", title: "DEMA", color: "#06b6d4" }],
  calc: (d, [period]) => {
    const { c } = hlcv(d);
    return { dema: dema(c, period) };
  },
});
