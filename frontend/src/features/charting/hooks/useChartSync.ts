import type { Chart } from "klinecharts";
import { useEffect } from "react";

const SYNC_LINE = "vwap"; // groupId that NepseTradingChart keeps out of saved drawings and undo/clear

/** Mirrors scroll/zoom and the crosshair time of any chart in `charts` onto the others while `enabled`. */
export function useChartSync(charts: (Chart | null)[], enabled: boolean) {
  useEffect(() => {
    const live = charts.filter((c): c is Chart => !!c);
    if (!enabled || live.length < 2) return;
    let busy = false; // our own setBarSpace/scroll calls re-fire the range events
    const lines = new Map<Chart, string>();

    const cleanups = live.map((src) => {
      const others = live.filter((c) => c !== src);
      const range = () => {
        if (busy) return;
        const list = src.getDataList();
        const last = list[Math.min(src.getVisibleRange().to, list.length) - 1];
        if (!last) return;
        busy = true;
        try {
          const space = src.getBarSpace().bar;
          others.forEach((o) => {
            o.setBarSpace(space);
            o.scrollToTimestamp(last.timestamp);
          });
        } finally {
          busy = false;
        }
      };
      const cross = (d?: unknown) => {
        // The crosshair payload carries pixels only, so resolve the hovered bar time ourselves.
        const at = d as { x?: number; paneId?: string } | undefined;
        const [p] = at?.x === undefined ? [] : (src.convertFromPixel([{ x: at.x }], { paneId: at.paneId }) as { timestamp?: number }[]);
        const ts = p?.timestamp;
        others.forEach((o) => {
          const id = lines.get(o);
          if (id) return void o.overrideOverlay({ id, visible: ts !== undefined, points: [{ timestamp: ts ?? 0 }] });
          if (ts === undefined) return;
          const made = o.createOverlay({
            name: "verticalStraightLine",
            groupId: SYNC_LINE,
            lock: true,
            points: [{ timestamp: ts }],
            styles: { line: { color: "rgba(128,128,128,0.7)", style: "dashed" } } as never,
          });
          if (typeof made === "string") lines.set(o, made);
        });
      };
      src.subscribeAction("onVisibleRangeChange", range);
      src.subscribeAction("onCrosshairChange", cross);
      return () => {
        src.unsubscribeAction("onVisibleRangeChange", range);
        src.unsubscribeAction("onCrosshairChange", cross);
      };
    });

    return () => {
      cleanups.forEach((f) => f());
      lines.forEach((id, c) => c.removeOverlay({ id }));
    };
  }, [charts, enabled]);
}
