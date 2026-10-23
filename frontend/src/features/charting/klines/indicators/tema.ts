import { tema } from "../../indicators";
import { hlcv, lineIndicator } from "./util";

export const TEMA = lineIndicator({
  name: "TEMA",
  label: "Triple Exponential Moving Average",
  main: true,
  calcParams: [20],
  lines: [{ key: "tema", title: "TEMA", color: "#f97316" }],
  calc: (d, [period]) => {
    const { c } = hlcv(d);
    return { tema: tema(c, period) };
  },
});
