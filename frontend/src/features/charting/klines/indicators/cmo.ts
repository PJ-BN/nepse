import { cmo } from "../../indicators";
import { hlcv, lineIndicator } from "./util";

export const CMO = lineIndicator({
  name: "CMO",
  label: "Chande Momentum Oscillator",
  main: false,
  calcParams: [14],
  lines: [{ key: "cmo", title: "CMO", color: "#6366f1" }],
  calc: (d, [period]) => {
    const { c } = hlcv(d);
    return { cmo: cmo(c, period) };
  },
});
