import { envelopes } from "../../indicators";
import { hlcv, lineIndicator } from "./util";

export const ENVELOPES = lineIndicator({
  name: "ENVELOPES",
  label: "Moving Average Envelopes",
  main: true,
  calcParams: [20, 2.5],
  lines: [
    { key: "upper", title: "Upper", color: "#3b82f6" },
    { key: "mid", title: "Mid", color: "#f59e0b" },
    { key: "lower", title: "Lower", color: "#3b82f6" },
  ],
  calc: (d, [period, pct]) => {
    const { c } = hlcv(d);
    return envelopes(c, period, pct);
  },
});
