import { pivots } from "../../indicators";
import { dayGroups, hlcv, isIntraday, lineIndicator, monthGroups } from "./util";

// Classic pivots from the previous day (intraday bars) or previous month (daily+ bars).
export const PIVOTS = lineIndicator({
  name: "PIVOTS",
  label: "Pivot Points",
  main: true,
  calcParams: [],
  lines: [
    { key: "r2", title: "R2", color: "#ef5350" },
    { key: "r1", title: "R1", color: "#ef9a9a" },
    { key: "p", title: "P", color: "#ff9800" },
    { key: "s1", title: "S1", color: "#80cbc4" },
    { key: "s2", title: "S2", color: "#26a69a" },
  ],
  calc: (d) => {
    const { h, l, c } = hlcv(d);
    return pivots(h, l, c, isIntraday(d) ? dayGroups(d) : monthGroups(d));
  },
});
