import { tsi } from "../../indicators";
import { hlcv, lineIndicator } from "./util";

export const TSI = lineIndicator({
  name: "TSI",
  label: "True Strength Index",
  main: false,
  calcParams: [25, 13, 13],
  lines: [
    { key: "tsi", title: "TSI", color: "#3b82f6" },
    { key: "signal", title: "Signal", color: "#ef4444" },
  ],
  calc: (d, [slow, fast, signal]) => {
    const { c } = hlcv(d);
    return tsi(c, slow, fast, signal);
  },
});
