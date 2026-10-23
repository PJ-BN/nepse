import { aroon } from "../../indicators";
import { hlcv, lineIndicator } from "./util";

export const AROON = lineIndicator({
  name: "AROON",
  label: "Aroon Indicator & Oscillator",
  main: false,
  calcParams: [14],
  lines: [
    { key: "up", title: "Aroon Up", color: "#16a34a" },
    { key: "down", title: "Aroon Down", color: "#dc2626" },
    { key: "osc", title: "Oscillator", color: "#f59e0b" },
  ],
  calc: (d, [period]) => {
    const { h, l } = hlcv(d);
    return aroon(h, l, period);
  },
});
