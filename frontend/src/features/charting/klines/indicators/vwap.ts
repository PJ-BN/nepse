import { vwap } from "../../indicators";
import { dayGroups, hlcv, isIntraday, lineIndicator } from "./util";

// Resets each trading day on intraday bars; cumulative over the loaded range on daily+ bars.
export const VWAP = lineIndicator({
  name: "VWAP",
  label: "VWAP",
  main: true,
  calcParams: [],
  lines: [{ key: "vwap", title: "VWAP", color: "#e8a317" }],
  calc: (d) => {
    const { h, l, c, v } = hlcv(d);
    return { vwap: vwap(h, l, c, v, isIntraday(d) ? dayGroups(d) : undefined) };
  },
});
