import { keltner } from "../../indicators";
import { hlcv, lineIndicator } from "./util";

export const KELTNER = lineIndicator({
  name: "KELTNER",
  label: "Keltner",
  main: true,
  calcParams: [20, 2, 10],
  lines: [
    { key: "upper", title: "Upper", color: "#2962ff" },
    { key: "mid", title: "Mid", color: "#ff9800" },
    { key: "lower", title: "Lower", color: "#2962ff" },
  ],
  calc: (d, [period, mult, atrPeriod]) => {
    const { h, l, c } = hlcv(d);
    return keltner(h, l, c, period, mult, atrPeriod);
  },
});
