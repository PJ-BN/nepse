import { mfi } from "../../indicators";
import { hlcv, lineIndicator } from "./util";

export const MFI = lineIndicator({
  name: "MFI",
  label: "Money Flow Index",
  main: false,
  calcParams: [14],
  lines: [{ key: "mfi", title: "MFI", color: "#3b82f6" }],
  calc: (d, [period]) => {
    const { h, l, c, v } = hlcv(d);
    return { mfi: mfi(h, l, c, v, period) };
  },
});
