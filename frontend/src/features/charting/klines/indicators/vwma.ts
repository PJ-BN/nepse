import { vwma } from "../../indicators";
import { hlcv, lineIndicator } from "./util";

export const VWMA = lineIndicator({
  name: "VWMA",
  label: "Volume Weighted Moving Average",
  main: true,
  calcParams: [20],
  lines: [{ key: "vwma", title: "VWMA", color: "#eab308" }],
  calc: (d, [period]) => {
    const { c, v } = hlcv(d);
    return { vwma: vwma(c, v, period) };
  },
});
