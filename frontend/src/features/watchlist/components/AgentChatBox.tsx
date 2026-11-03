"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth";
import { sendAgentMessage, fetchPromptLimit, type PromptLimitInfo } from "../api";
import { StockCard } from "./StockCard";
import type { AgentChatMessage, StockAgentEvaluation } from "@/features/ai/agentTypes";

type AgentChatBoxProps = {
  userWatchlistSymbols: string[];
  isWatchlisted: (symbol: string) => boolean;
  onToggleWatchlist: (symbol: string) => void;
};

const PROMPT_SUGGESTIONS = [
  "⭐ Review my personal watchlist",
  "🟢 Best high-conviction buys today",
  "⚡ Stocks with highest broker accumulation",
  "📢 Top dividend catalysts to watchlist",
  "⚠️ Overbought stocks to take profit",
  "🏦 Best Commercial Banks to trade",
];

export function AgentChatBox({ userWatchlistSymbols, isWatchlisted, onToggleWatchlist }: AgentChatBoxProps) {
  const { isAuthenticated, user, openAuthModal } = useAuth();
  const [promptQuota, setPromptQuota] = useState<PromptLimitInfo | null>(null);
  const [messages, setMessages] = useState<AgentChatMessage[]>([
    {
      id: "welcome",
      role: "agent",
      content:
        "Hello! I am your **NEPSE Trading & Watchlist Agent**. I scan hundreds of listed stocks, track moving averages, RSI divergences, institutional broker accumulation, and corporate news (dividends, AGMs) to guide your trades.\n\nAsk me any question below, or select a prompt:",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Load daily prompt quota on mount and when authentication changes
  useEffect(() => {
    if (!isAuthenticated) {
      setPromptQuota(null);
      return;
    }
    let isSubscribed = true;
    fetchPromptLimit()
      .then((data) => {
        if (isSubscribed) setPromptQuota(data);
      })
      .catch((err) => {
        console.warn("Could not load prompt limit:", err);
      });
    return () => {
      isSubscribed = false;
    };
  }, [isAuthenticated]);

  const isAdmin = user?.role === "admin" || promptQuota?.is_admin === true;
  const isLimitReached =
    !isAdmin && promptQuota !== null && promptQuota.remaining !== null && promptQuota.remaining <= 0;

  const handleSend = async (queryText?: string) => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }

    if (isLimitReached) {
      const limitNotice: AgentChatMessage = {
        id: `agent-limit-${Date.now()}`,
        role: "agent",
        content:
          "⏳ Daily prompt limit reached (5 prompts/day). Your free quota resets at midnight (NPT). Admin accounts have unlimited access.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, limitNotice]);
      return;
    }

    const q = (queryText ?? input).trim();
    if (!q || isLoading) return;

    const userMsg: AgentChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await sendAgentMessage(q, userWatchlistSymbols);

      // Update quota status from backend response
      if (res.usage) {
        setPromptQuota(res.usage);
      } else if (!isAdmin) {
        setPromptQuota((prev) =>
          prev
            ? {
                ...prev,
                used: prev.used + 1,
                remaining: Math.max(0, (prev.remaining ?? 5) - 1),
              }
            : null
        );
      }

      const agentMsg: AgentChatMessage = {
        id: `agent-${Date.now()}`,
        role: "agent",
        content: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        stocks: res.recommendedStocks,
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Network error";
      const is429 = errMsg.includes("429") || errMsg.toLowerCase().includes("limit reached");

      if (is429) {
        setPromptQuota((prev) =>
          prev
            ? { ...prev, remaining: 0, used: prev.limit ?? 5 }
            : {
                is_admin: false,
                limit: 5,
                used: 5,
                remaining: 0,
                reset_date: new Date().toISOString().split("T")[0],
              }
        );
      }

      const errorMsg: AgentChatMessage = {
        id: `agent-err-${Date.now()}`,
        role: "agent",
        content: is429
          ? "⏳ Daily limit of 5 prompts reached. Your quota will reset tomorrow at midnight (NPT). Admin accounts have unlimited access."
          : `⚠️ Apologies, could not complete the query: ${errMsg}. Please try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary text-sm font-bold border border-primary/25 shrink-0">
            🤖
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">
                NEPSE AI Agent Assistant
              </h3>
              <span className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 px-2 py-0.2 text-[10px] font-bold uppercase">
                Active Scanner
              </span>

              {/* Prompt Quota Indicator Badge */}
              {isAuthenticated && (
                <>
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 px-2 py-0.2 text-[10px] font-bold uppercase tracking-wider">
                      <span>⚡</span> Unlimited Prompts (Admin)
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.2 text-[10px] font-bold tracking-wide transition-colors ${
                        isLimitReached
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                          : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                      }`}
                      title="Normal accounts have a free daily limit of 5 prompts. Resets at midnight NPT."
                    >
                      <span>💬</span>
                      {promptQuota
                        ? `${promptQuota.remaining ?? 0}/${promptQuota.limit ?? 5} Prompts Left Today`
                        : "5/5 Prompts Left"}
                    </span>
                  )}
                </>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Ask anything about market setups, stocks to buy/sell, or your watchlist</p>
          </div>
        </div>

        {messages.length > 1 && (
          <button
            onClick={() => setMessages(messages.slice(0, 1))}
            className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
          >
            Clear Chat
          </button>
        )}
      </div>

      {/* Message Stream */}
      <div className="max-h-[500px] overflow-y-auto p-5 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground font-medium rounded-tr-xs"
                  : "bg-muted/50 border border-border/70 text-foreground rounded-tl-xs whitespace-pre-wrap"
              }`}
            >
              {m.content}
            </div>

            {/* Attached Stock Cards */}
            {m.stocks && m.stocks.length > 0 && (
              <div className="mt-3 grid w-full gap-3 sm:grid-cols-2">
                {m.stocks.map((stock: StockAgentEvaluation) => (
                  <StockCard
                    key={stock.symbol}
                    stock={stock}
                    isWatchlisted={isWatchlisted(stock.symbol)}
                    onToggleWatchlist={onToggleWatchlist}
                    compact
                  />
                ))}
              </div>
            )}

            <span className="mt-1 px-1 text-[10px] text-muted-foreground font-mono">
              {m.timestamp}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground animate-pulse">
            <span className="flex h-2 w-2 animate-ping rounded-full bg-primary" />
            <span>Agent is analyzing order flow, moving averages & news catalysts…</span>
          </div>
        )}
      </div>

      {/* Suggestion Chips */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-border/40 bg-muted/10 px-5 py-2.5">
        <span className="text-[11px] font-semibold text-muted-foreground mr-1">Suggestions:</span>
        {PROMPT_SUGGESTIONS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => handleSend(prompt)}
            disabled={isLoading || isLimitReached}
            className="rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Daily Quota Limit Warning Banner */}
      {isLimitReached && (
        <div className="flex items-center justify-between gap-3 border-t border-rose-500/30 bg-rose-500/10 px-5 py-2.5 text-xs text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <span className="text-sm">⏳</span>
            <span>You have reached your <strong>daily limit of 5 prompts</strong>. Your daily quota resets at midnight (NPT).</span>
          </div>
          <span className="shrink-0 rounded-md bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            Limit Reached
          </span>
        </div>
      )}

      {/* Input Box or Login Prompt */}
      {!isAuthenticated ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/60 bg-muted/20 p-4">
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <span className="text-base">🔒</span>
            <span>Sign in to converse with the NEPSE AI Agent and run interactive scans.</span>
          </div>
          <button
            type="button"
            onClick={() => openAuthModal("login")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-90 shrink-0 cursor-pointer"
          >
            <span>Sign In to Chat</span>
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 border-t border-border/60 bg-card p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isLimitReached
                ? "Daily limit reached (5 prompts/day). Resets at midnight NPT."
                : "Ask the Agent (e.g. Which banking stock should I buy today? Is NABIL a buy or sell?)..."
            }
            disabled={isLoading || isLimitReached}
            className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isLimitReached}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer disabled:cursor-not-allowed"
          >
            <span>Send</span>
          </button>
        </form>
      )}
    </div>
  );
}
