import { histVol } from "../../indicators";
import { hlcv, lineIndicator } from "./util";

export const HISTVOL = lineIndicator({
  name: "HV",
  label: "Historical Volatility",
  main: false,
  calcParams: [20],
  lines: [{ key: "hv", title: "HV%", color: "#f59e0b" }],
  calc: (d, [period]) => {
    const { c } = hlcv(d);
    return { hv: histVol(c, period) };
  },
});
