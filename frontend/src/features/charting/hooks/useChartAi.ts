"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Chart } from "klinecharts";
import { useCallback, useMemo, useState } from "react";
import { fetchChartAiAnalysis } from "@/features/ai/api";
import type { ChartAiAnalysis } from "@/features/ai/types";
import { saveDrawings, loadDrawings, type Drawing } from "../drawings";
import type { Candle, Indicator, IndicatorType } from "../types";

export function useChartAi(
  symbol: string,
  resolution = "1D",
  candles: Candle[] = [],
  chart: Chart | null = null,
  onApplyIndicators?: (next: Indicator[]) => void
) {
  const queryClient = useQueryClient();
  const upper = symbol.toUpperCase();
  const queryKey = useMemo(() => ["ai-chart", upper, resolution], [upper, resolution]);
  const [appliedOverlays, setAppliedOverlays] = useState<string[]>([]);
  const [isAiOverlaysActive, setIsAiOverlaysActive] = useState(false);

  const query = useQuery<ChartAiAnalysis>({
    queryKey,
    queryFn: () => fetchChartAiAnalysis(upper, resolution, candles),
    staleTime: 10 * 60 * 1000,
    enabled: Boolean(symbol) && candles.length > 5,
    refetchOnWindowFocus: false,
  });

  const refreshMutation = useMutation({
    mutationFn: () => fetchChartAiAnalysis(upper, resolution, candles, true),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
  });

  const analyzeWithAgy = useCallback(
    async (forceRefresh = false): Promise<ChartAiAnalysis> => {
      if (!forceRefresh && query.data) {
        return query.data;
      }
      const data = await fetchChartAiAnalysis(upper, resolution, candles, forceRefresh);
      queryClient.setQueryData(queryKey, data);
      return data;
    },
    [candles, query.data, queryClient, queryKey, resolution, upper]
  );

  const refreshAiAsync = useCallback(async (): Promise<ChartAiAnalysis> => {
    return await refreshMutation.mutateAsync();
  }, [refreshMutation]);

  // Apply AI-generated drawing tools (trendlines, support/resistance, demand box) directly to chart canvas
  const applyDrawingsToChart = useCallback(
    (customData?: ChartAiAnalysis) => {
      const analysis = customData || query.data;
      if (!analysis || !chart || !symbol) return;

      const tf = resolution || "1D";

      // Convert recommended drawings to klinecharts Drawing format
      const newDrawings: Drawing[] = analysis.recommended_drawings.map((d) => {
        const styles: Record<string, unknown> = {};
        if (d.name === "rect") {
          styles.rect = {
            color: "rgba(16, 185, 129, 0.12)",
            borderColor: d.color || "#10b981",
            borderSize: 1,
          };
        } else {
          styles.line = {
            color: d.color || "#3b82f6",
            size: 2,
            style: "solid",
          };
        }

        return {
          name: d.name,
          points: d.points,
          lock: false,
          styles: styles as never,
          extendData: { isAi: true, label: d.label },
          tf,
        };
      });

      // Retain existing manual drawings and append AI drawings
      const existing = loadDrawings(symbol, tf).filter((d) => !(d.extendData as { isAi?: boolean })?.isAi);
      const merged = [...existing, ...newDrawings];
      saveDrawings(symbol, tf, merged);

      // Create overlays directly on the chart canvas
      const createdIds: string[] = [];
      newDrawings.forEach((d) => {
        try {
          const id = chart.createOverlay({
            name: d.name,
            points: d.points,
            styles: d.styles,
            extendData: d.extendData,
          });
          if (typeof id === "string") createdIds.push(id);
        } catch (e) {
          console.warn("Could not create overlay on chart:", d.name, e);
        }
      });

      setAppliedOverlays(createdIds);
      setIsAiOverlaysActive(true);
    },
    [chart, query.data, resolution, symbol]
  );

  // Clear AI drawings from chart canvas
  const clearAiDrawings = useCallback(() => {
    if (!chart || !symbol) return;
    const tf = resolution || "1D";

    // Remove from chart overlays
    appliedOverlays.forEach((id) => {
      try {
        chart.removeOverlay({ id });
      } catch {
        // Overlay may have already been cleared
      }
    });

    // Remove from localStorage
    const remaining = loadDrawings(symbol, tf).filter((d) => !(d.extendData as { isAi?: boolean })?.isAi);
    saveDrawings(symbol, tf, remaining);

    setAppliedOverlays([]);
    setIsAiOverlaysActive(false);
  }, [appliedOverlays, chart, resolution, symbol]);

  // Apply recommended indicators (e.g. EMA 20, SMA 50, RSI 14, Supertrend)
  const applyRecommendedIndicators = useCallback(() => {
    if (!query.data || !onApplyIndicators) return;

    const recs = query.data.recommended_indicators;

    const indicatorsToSet: Indicator[] = recs.map((r, i) => ({
      id: `ai_${r.type}_${r.period || i}`,
      type: r.type as IndicatorType,
      period: r.period || 14,
      color: r.color || "#3b82f6",
    }));

    onApplyIndicators(indicatorsToSet);
  }, [onApplyIndicators, query.data]);

  return {
    ...query,
    analyzeWithAgy,
    refreshAi: refreshMutation.mutate,
    refreshAiAsync,
    isRefreshing: refreshMutation.isPending,
    applyDrawingsToChart,
    clearAiDrawings,
    applyRecommendedIndicators,
    isAiOverlaysActive,
    appliedDrawingsCount: query.data?.recommended_drawings?.length ?? 0,
  };
}
