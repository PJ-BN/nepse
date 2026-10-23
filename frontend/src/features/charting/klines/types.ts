/** The klinecharts module, passed in because it can't be imported during SSR (it touches `window`). */
export type Kline = typeof import("klinecharts");
