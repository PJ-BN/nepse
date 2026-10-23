import { supertrend } from "../../indicators";
import { hlcv, lineIndicator } from "./util";

export const SUPERTREND = lineIndicator({
  name: "SUPERTREND",
  label: "Supertrend",
  main: true,
  calcParams: [10, 3],
  lines: [
    { key: "up", title: "Up", color: "#26a69a" },
    { key: "down", title: "Down", color: "#ef5350" },
  ],
  calc: (d, [period, mult]) => {
    const { h, l, c } = hlcv(d);
    const { line, dir } = supertrend(h, l, c, period, mult);
    return { up: line.map((v, i) => (dir[i] === 1 ? v : null)), down: line.map((v, i) => (dir[i] === -1 ? v : null)) };
  },
});
