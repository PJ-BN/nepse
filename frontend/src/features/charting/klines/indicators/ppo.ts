import { ppo } from "../../indicators";
import { hlcv, lineIndicator } from "./util";

export const PPO = lineIndicator({
  name: "PPO",
  label: "Percentage Price Oscillator",
  main: false,
  calcParams: [12, 26, 9],
  lines: [
    { key: "ppo", title: "PPO", color: "#3b82f6" },
    { key: "signal", title: "Signal", color: "#f97316" },
    { key: "hist", title: "Hist", color: "#8b5cf6" },
  ],
  calc: (d, [fast, slow, signal]) => {
    const { c } = hlcv(d);
    return ppo(c, fast, slow, signal);
  },
});
