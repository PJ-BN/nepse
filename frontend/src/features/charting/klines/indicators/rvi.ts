import { rvi } from "../../indicators";
import { ohlcv, lineIndicator } from "./util";

export const RVI = lineIndicator({
  name: "RVI",
  label: "Relative Vigor Index",
  main: false,
  calcParams: [14],
  lines: [
    { key: "rvi", title: "RVI", color: "#2563eb" },
    { key: "signal", title: "Signal", color: "#dc2626" },
  ],
  calc: (d, [period]) => {
    const { o, h, l, c } = ohlcv(d);
    return rvi(o, h, l, c, period);
  },
});
