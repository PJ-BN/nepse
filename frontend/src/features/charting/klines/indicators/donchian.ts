import { donchian } from "../../indicators";
import { hlcv, lineIndicator } from "./util";

export const DONCHIAN = lineIndicator({
  name: "DONCHIAN",
  label: "Donchian",
  main: true,
  calcParams: [20],
  lines: [
    { key: "upper", title: "Upper", color: "#26a69a" },
    { key: "mid", title: "Mid", color: "#ff9800" },
    { key: "lower", title: "Lower", color: "#ef5350" },
  ],
  calc: (d, [period]) => {
    const { h, l } = hlcv(d);
    return donchian(h, l, period);
  },
});
