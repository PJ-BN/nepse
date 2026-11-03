"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchExecutionLogs, fetchSchedules, runJobManually, updateSchedule } from "../api";
import { DataSyncModal } from "@/features/sync";

export function AdminSchedulesTab() {
  const queryClient = useQueryClient();
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [manualOutput, setManualOutput] = useState<Record<string, unknown> | null>(null);
  const [timeInputs, setTimeInputs] = useState<Record<string, string>>({});

  const { data: schedules, isLoading, error } = useQuery({
    queryKey: ["admin-schedules"],
    queryFn: fetchSchedules,
  });

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["admin-execution-logs"],
    queryFn: () => fetchExecutionLogs(25),
    refetchInterval: 10000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ jobId, updates }: { jobId: string; updates: Partial<import("../types").ScheduledJob> }) =>
      updateSchedule(jobId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (err: Error) => alert(err.message),
  });

  const handleRunNow = async (jobId: string) => {
    try {
      setRunningJobId(jobId);
      setManualOutput(null);
      const res = await runJobManually(jobId);
      setManualOutput(res);
    } catch (err: unknown) {
      setManualOutput({ error: (err as Error).message });
    } finally {
      setRunningJobId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-execution-logs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    }
  };

  if (isLoading) {
    return <div className="h-64 rounded-2xl bg-muted/30 animate-pulse" />;
  }

  if (error || !schedules) {
    return <div className="text-sm text-rose-500">Failed to load schedules.</div>;
  }

  return (
    <div className="space-y-8">
      {/* 1. Master Evening AI Pipeline Hero Card */}
      <div className="rounded-3xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card to-card p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🕒</span>
              <h3 className="text-base font-bold text-foreground">Daily 4:00 PM Master AI & Market Wrap Pipeline</h3>
              <span className="rounded-md bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-400">
                CORE ORCHESTRATOR
              </span>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Executes automatically once every trading day around 4:00 PM NPT. Ingests EOD data, runs the Market
              Dynamic & Macro Read Agent, AI Trade Agent, and AI Watchlist Agent, and saves all evaluations to the
              database so all visitors see the shared daily report.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <DataSyncModal
              triggerLabel="Manual Ingestion Modal"
              triggerClassName="flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 px-4 py-2.5 text-xs font-bold text-foreground transition-all hover:bg-muted/40 cursor-pointer shadow-xs"
            />
            <button
              onClick={() => handleRunNow("daily_evening_ai_master")}
              disabled={Boolean(runningJobId)}
              className="rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-background transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {runningJobId === "daily_evening_ai_master" ? "⚡ Running Pipeline…" : "▶ Run Evening Pipeline Now"}
            </button>
          </div>
        </div>

        {/* Manual Result Banner */}
        {manualOutput && (
          <div className="mt-4 rounded-2xl border border-border/80 bg-background/80 p-4 text-xs font-mono">
            <div className="font-bold text-foreground mb-1">Execution Result:</div>
            <pre className="overflow-x-auto text-[11px] text-muted-foreground">
              {JSON.stringify(manualOutput, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* 2. Manual Data Ingestion & Live Sync Room */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔄</span>
            <h4 className="text-sm font-bold text-foreground">Manual Data Ingestion & Sync Center</h4>
            <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
              ADMIN CONTROL
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Directly trigger individual ingestion jobs for EOD closing prices, floorsheet trades, financial news, SEBON filings, or full crosscheck with live streaming logs.
          </p>
        </div>
        <DataSyncModal
          triggerLabel="Launch Ingestion Center"
          triggerClassName="shrink-0 flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-all hover:opacity-90 cursor-pointer shadow-xs"
        />
      </div>

      {/* 3. Scheduled Jobs Table */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-foreground">Configured Schedules (Nepal Time - NPT)</h4>
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/80 bg-muted/30 text-muted-foreground font-semibold">
              <tr>
                <th className="px-5 py-3.5">Job Name</th>
                <th className="px-5 py-3.5">Schedule Time (NPT)</th>
                <th className="px-5 py-3.5">Days</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Last Run</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {schedules.map((job) => (
                <tr key={job.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-foreground">{job.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{job.id}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        defaultValue={job.schedule_time_npt}
                        onChange={(e) => setTimeInputs((prev) => ({ ...prev, [job.id]: e.target.value }))}
                        className="rounded-lg border border-border/80 bg-background px-2.5 py-1 text-xs font-mono font-bold text-foreground focus:outline-none"
                      />
                      {timeInputs[job.id] && timeInputs[job.id] !== job.schedule_time_npt && (
                        <button
                          onClick={() => {
                            updateMutation.mutate({
                              jobId: job.id,
                              updates: { schedule_time_npt: timeInputs[job.id] },
                            });
                          }}
                          className="rounded-lg bg-primary/20 px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary/30 cursor-pointer"
                        >
                          Save
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[11px] text-muted-foreground">{job.days_of_week}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                        job.last_status === "SUCCESS"
                          ? "bg-emerald-500/15 text-emerald-500"
                          : job.last_status === "FAILED"
                          ? "bg-rose-500/15 text-rose-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {job.last_status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {job.last_run_at ? new Date(job.last_run_at).toLocaleTimeString() : "Never"}
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-2">
                    <button
                      onClick={() => handleRunNow(job.id)}
                      disabled={Boolean(runningJobId)}
                      className="rounded-lg border border-border/80 bg-surface/80 px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {runningJobId === job.id ? "Running…" : "Run Now"}
                    </button>
                    <button
                      onClick={() => updateMutation.mutate({ jobId: job.id, updates: { is_enabled: !job.is_enabled } })}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                        job.is_enabled ? "text-amber-500 hover:underline" : "text-emerald-500 hover:underline"
                      }`}
                    >
                      {job.is_enabled ? "Pause" : "Resume"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Execution & Token Audit Logs */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-foreground">Recent Pipeline Executions & Token Logs</h4>
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/80 bg-muted/30 text-muted-foreground font-semibold">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Job</th>
                <th className="px-5 py-3">Triggered By</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Duration</th>
                <th className="px-5 py-3">Tokens (In / Out)</th>
                <th className="px-5 py-3 text-right">Est. Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {logsLoading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    Loading execution logs…
                  </td>
                </tr>
              ) : !logs || logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    No execution logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/15 transition-colors font-mono text-[11px]">
                    <td className="px-5 py-3 text-muted-foreground font-sans">
                      {new Date(log.started_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 font-semibold text-foreground">{log.job_id}</td>
                    <td className="px-5 py-3 text-muted-foreground">{log.triggered_by}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                          log.status === "SUCCESS"
                            ? "bg-emerald-500/15 text-emerald-500"
                            : "bg-rose-500/15 text-rose-500"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{log.duration_sec}s</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {log.prompt_tokens} in / {log.completion_tokens} out
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-foreground">
                      ${log.cost_usd.toFixed(5)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
