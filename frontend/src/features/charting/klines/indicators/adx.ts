import { adx } from "../../indicators";
import { hlcv, lineIndicator } from "./util";

export const ADX = lineIndicator({
  name: "ADX",
  label: "ADX",
  main: false,
  calcParams: [14],
  lines: [
    { key: "adx", title: "ADX", color: "#ff9800" },
    { key: "plus", title: "+DI", color: "#26a69a" },
    { key: "minus", title: "-DI", color: "#ef5350" },
  ],
  calc: (d, [period]) => {
    const { h, l, c } = hlcv(d);
    return adx(h, l, c, period);
  },
});
