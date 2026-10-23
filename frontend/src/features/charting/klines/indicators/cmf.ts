import { cmf } from "../../indicators";
import { hlcv, lineIndicator } from "./util";

export const CMF = lineIndicator({
  name: "CMF",
  label: "Chaikin Money Flow",
  main: false,
  calcParams: [20],
  lines: [{ key: "cmf", title: "CMF", color: "#10b981" }],
  calc: (d, [period]) => {
    const { h, l, c, v } = hlcv(d);
    return { cmf: cmf(h, l, c, v, period) };
  },
});
