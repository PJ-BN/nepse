import { bbw } from "../../indicators";
import { hlcv, lineIndicator } from "./util";

export const BBW = lineIndicator({
  name: "BBW",
  label: "Bollinger Band Width & %B",
  main: false,
  calcParams: [20, 2],
  lines: [
    { key: "width", title: "Width", color: "#8b5cf6" },
    { key: "pctB", title: "%B", color: "#06b6d4" },
  ],
  calc: (d, [period, mult]) => {
    const { c } = hlcv(d);
    return bbw(c, period, mult);
  },
});
