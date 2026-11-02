"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDataSources, testDataSourceHealth, updateDataSource } from "../api";

export function AdminDataSourcesTab() {
  const queryClient = useQueryClient();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { status: string; latency_ms: number; error?: string }>>({});

  const { data: sources, isLoading, error } = useQuery({
    queryKey: ["admin-data-sources"],
    queryFn: fetchDataSources,
  });

  const updateMutation = useMutation({
    mutationFn: ({ sourceId, updates }: { sourceId: string; updates: Partial<import("../types").DataSource> }) =>
      updateDataSource(sourceId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-data-sources"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (err: Error) => alert(err.message),
  });

  const handleTest = async (sourceId: string) => {
    try {
      setTestingId(sourceId);
      const res = await testDataSourceHealth(sourceId);
      setTestResult((prev) => ({ ...prev, [sourceId]: res }));
      queryClient.invalidateQueries({ queryKey: ["admin-data-sources"] });
    } catch (err: unknown) {
      setTestResult((prev) => ({
        ...prev,
        [sourceId]: { status: "DOWN", latency_ms: 0, error: (err as Error).message },
      }));
    } finally {
      setTestingId(null);
    }
  };

  if (isLoading) {
    return <div className="h-64 rounded-2xl bg-muted/30 animate-pulse" />;
  }

  if (error || !sources) {
    return <div className="text-sm text-rose-500">Failed to load data sources.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-foreground">Data Sources & Upstream Ingestion Connectors</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure where the platform ingests market, fundamentals, macro, and news data from. Toggle sources or test live connectivity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sources.map((src) => {
          const test = testResult[src.id];
          const isTesting = testingId === src.id;

          return (
            <div
              key={src.id}
              className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase font-mono">
                    {src.category}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      src.health_status === "HEALTHY"
                        ? "bg-emerald-500/15 text-emerald-500"
                        : src.health_status === "DEGRADED"
                        ? "bg-amber-500/15 text-amber-500"
                        : "bg-rose-500/15 text-rose-500"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {src.health_status}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-foreground">{src.name}</h4>
                  <div className="mt-1 font-mono text-[11px] text-muted-foreground">{src.id}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-2 border-t border-border/60">
                  <div>
                    Priority: <strong className="text-foreground">{src.priority}</strong>
                  </div>
                  <div>
                    Rate Limit: <strong className="text-foreground">{src.rate_limit_delay_ms}ms</strong>
                  </div>
                </div>

                {src.last_success_at && (
                  <div className="text-[10px] text-muted-foreground">
                    Last Success: {new Date(src.last_success_at).toLocaleTimeString()}
                  </div>
                )}

                {test && (
                  <div
                    className={`rounded-xl p-2.5 text-[11px] font-semibold border ${
                      test.status === "HEALTHY"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-500"
                    }`}
                  >
                    Ping: {test.latency_ms}ms {test.error ? `• Error: ${test.error}` : "• Online"}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                <button
                  onClick={() => handleTest(src.id)}
                  disabled={isTesting}
                  className="rounded-xl border border-border/80 bg-surface/80 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isTesting ? "Pinging…" : "⚡ Ping Test"}
                </button>

                <button
                  onClick={() => updateMutation.mutate({ sourceId: src.id, updates: { is_enabled: !src.is_enabled } })}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                    src.is_enabled
                      ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {src.is_enabled ? "Enabled" : "Disabled"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
