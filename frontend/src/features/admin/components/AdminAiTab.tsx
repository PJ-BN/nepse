"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAiConfig, updateAgentConfig, updateOpenRouterConfig } from "../api";
import type { AiAgentConfig } from "../types";

export function AdminAiTab() {
  const queryClient = useQueryClient();
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AiAgentConfig | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-ai-config"],
    queryFn: fetchAiConfig,
  });

  const openRouterMutation = useMutation({
    mutationFn: updateOpenRouterConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ai-config"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      setStatusMsg("OpenRouter settings updated successfully.");
      setApiKeyInput("");
      setShowKeyInput(false);
      setTimeout(() => setStatusMsg(null), 3000);
    },
    onError: (err: Error) => alert(err.message),
  });

  const agentMutation = useMutation({
    mutationFn: ({ agentId, updates }: { agentId: string; updates: Partial<AiAgentConfig> }) =>
      updateAgentConfig(agentId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ai-config"] });
      setStatusMsg("AI Agent configuration saved.");
      setSelectedAgent(null);
      setTimeout(() => setStatusMsg(null), 3000);
    },
    onError: (err: Error) => alert(err.message),
  });

  if (isLoading) {
    return <div className="h-64 rounded-2xl bg-muted/30 animate-pulse" />;
  }

  if (error || !data) {
    return <div className="text-sm text-rose-500">Failed to load AI configuration.</div>;
  }

  const { openrouter, agents, token_usage } = data;

  return (
    <div className="space-y-8">
      {statusMsg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-500">
          ✓ {statusMsg}
        </div>
      )}

      {/* 1. OpenRouter & Token Optimization Hero */}
      <div className="rounded-3xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card to-card p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <h3 className="text-base font-bold text-foreground">OpenRouter High-Efficiency AI Routing</h3>
              <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                ULTRA LOW TOKENS
              </span>
            </div>
            <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
              Equities are pre-screened and compressed from 250+ stocks down to a 350-token delimited matrix.
              Daily LLM inference costs fraction of a cent (~$0.0002/day) via OpenRouter.
            </p>
          </div>

          {/* Token Stats Pill */}
          <div className="flex items-center gap-4 rounded-2xl border border-border/80 bg-surface/80 px-4 py-3 text-xs">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold">Total AI Spend</div>
              <div className="text-base font-extrabold text-foreground">${token_usage.total_cost_usd.toFixed(4)}</div>
            </div>
            <div className="h-8 w-px bg-border/80" />
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold">Tokens Consumed</div>
              <div className="text-base font-extrabold text-primary">{token_usage.total_tokens.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Key & Model Controls */}
        <div className="mt-6 grid gap-4 md:grid-cols-3 pt-6 border-t border-border/60">
          {/* API Key */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">OpenRouter API Key</label>
            <div className="flex items-center gap-2">
              {showKeyInput ? (
                <input
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="flex-1 rounded-xl border border-border/80 bg-card px-3 py-2 text-xs text-foreground focus:outline-none"
                />
              ) : (
                <div className="flex-1 rounded-xl border border-border/80 bg-muted/30 px-3 py-2 font-mono text-xs text-muted-foreground">
                  {openrouter.masked_key || "Not configured"}
                </div>
              )}
              {showKeyInput ? (
                <button
                  onClick={() => openRouterMutation.mutate({ api_key: apiKeyInput })}
                  disabled={!apiKeyInput.trim()}
                  className="rounded-xl bg-accent px-3 py-2 text-xs font-bold text-background disabled:opacity-50 cursor-pointer"
                >
                  Save
                </button>
              ) : (
                <button
                  onClick={() => setShowKeyInput(true)}
                  className="rounded-xl border border-border/80 bg-surface/80 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/40 cursor-pointer"
                >
                  Change
                </button>
              )}
            </div>
          </div>

          {/* Model Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Default OpenRouter Model</label>
            <select
              value={openrouter.default_model}
              onChange={(e) => openRouterMutation.mutate({ default_model: e.target.value })}
              className="w-full rounded-xl border border-border/80 bg-card px-3 py-2 text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="deepseek/deepseek-chat">deepseek/deepseek-chat (~$0.14/1M)</option>
              <option value="google/gemini-2.5-flash">google/gemini-2.5-flash (~$0.075/1M)</option>
              <option value="meta-llama/llama-3.3-70b-instruct">meta-llama/llama-3.3-70b-instruct (~$0.12/1M)</option>
              <option value="anthropic/claude-3.5-haiku">anthropic/claude-3.5-haiku (~$0.80/1M)</option>
            </select>
          </div>

          {/* Monthly Budget Cap */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Monthly Safety Budget (USD)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="1"
                min="1"
                defaultValue={openrouter.monthly_budget_usd}
                onBlur={(e) => openRouterMutation.mutate({ monthly_budget_usd: parseFloat(e.target.value) || 10.0 })}
                className="w-full rounded-xl border border-border/80 bg-card px-3 py-2 text-xs text-foreground focus:outline-none"
              />
              <span className="text-xs text-muted-foreground shrink-0">USD/mo</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Specialized AI Agents Studio */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">Active Daily AI Agents</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            These three agents execute in sequence at 4:00 PM NPT and persist results for all platform visitors.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {agents.map((agent) => (
            <div
              key={agent.agent_id}
              className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary font-mono">
                    {agent.agent_id}
                  </span>
                  <span
                    className={`h-2 w-2 rounded-full ${agent.is_enabled ? "bg-emerald-500" : "bg-muted-foreground"}`}
                  />
                </div>
                <h4 className="text-sm font-bold text-foreground">{agent.name}</h4>
                <p className="text-xs text-muted-foreground font-mono">Model: {agent.model_slug}</p>
                <div className="text-xs text-muted-foreground">
                  Temp: <span className="text-foreground font-semibold">{agent.temperature}</span> | Max Tokens:{" "}
                  <span className="text-foreground font-semibold">{agent.max_tokens}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                <button
                  onClick={() => setSelectedAgent(agent)}
                  className="rounded-xl border border-border/80 bg-surface/80 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  Configure Prompt →
                </button>
                <button
                  onClick={() => agentMutation.mutate({ agentId: agent.agent_id, updates: { is_enabled: !agent.is_enabled } })}
                  className={`text-xs font-semibold cursor-pointer ${
                    agent.is_enabled ? "text-amber-500 hover:underline" : "text-emerald-500 hover:underline"
                  }`}
                >
                  {agent.is_enabled ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Prompt Configuration Modal/Drawer */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl border border-border/80 bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Configure Agent: {selectedAgent.name}</h3>
                <span className="text-xs text-muted-foreground font-mono">{selectedAgent.agent_id}</span>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="rounded-xl border border-border/80 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/30 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground">System Prompt (Persona & Rules)</label>
                <textarea
                  rows={3}
                  defaultValue={selectedAgent.system_prompt}
                  id="system_prompt_input"
                  className="mt-1 w-full rounded-xl border border-border/80 bg-background p-3 text-xs text-foreground focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">
                  User Prompt Template (Supports {"{macro_vector}"}, {"{candidates_csv}"})
                </label>
                <textarea
                  rows={5}
                  defaultValue={selectedAgent.user_prompt_template}
                  id="user_prompt_input"
                  className="mt-1 w-full rounded-xl border border-border/80 bg-background p-3 text-xs text-foreground focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground">Temperature (0.0 - 1.0)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    defaultValue={selectedAgent.temperature}
                    id="temperature_input"
                    className="mt-1 w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Max Output Tokens</label>
                  <input
                    type="number"
                    step="128"
                    min="256"
                    max="4096"
                    defaultValue={selectedAgent.max_tokens}
                    id="max_tokens_input"
                    className="mt-1 w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs text-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
              <button
                onClick={() => setSelectedAgent(null)}
                className="rounded-xl border border-border/80 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/40 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const sys = (document.getElementById("system_prompt_input") as HTMLTextAreaElement).value;
                  const usr = (document.getElementById("user_prompt_input") as HTMLTextAreaElement).value;
                  const temp = parseFloat((document.getElementById("temperature_input") as HTMLInputElement).value);
                  const maxTok = parseInt((document.getElementById("max_tokens_input") as HTMLInputElement).value, 10);
                  agentMutation.mutate({
                    agentId: selectedAgent.agent_id,
                    updates: {
                      system_prompt: sys,
                      user_prompt_template: usr,
                      temperature: temp,
                      max_tokens: maxTok,
                    },
                  });
                }}
                className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-background cursor-pointer"
              >
                Save Agent Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
