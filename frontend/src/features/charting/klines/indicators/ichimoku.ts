import { ichimoku } from "../../indicators";
import { hlcv, lineIndicator } from "./util";

// Lines only (no cloud fill); spans are displaced within the loaded bars.
export const ICHIMOKU = lineIndicator({
  name: "ICHIMOKU",
  label: "Ichimoku",
  main: true,
  calcParams: [9, 26, 52],
  lines: [
    { key: "tenkan", title: "Tenkan", color: "#2962ff" },
    { key: "kijun", title: "Kijun", color: "#e53935" },
    { key: "spanA", title: "Span A", color: "#26a69a" },
    { key: "spanB", title: "Span B", color: "#ef5350" },
    { key: "chikou", title: "Chikou", color: "#9c27b0" },
  ],
  calc: (d, [conv, base, spanB]) => {
    const { h, l, c } = hlcv(d);
    return ichimoku(h, l, c, conv, base, spanB, base);
  },
});
