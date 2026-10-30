"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth";
import { sendAgentMessage } from "../api";
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
  const { isAuthenticated, openAuthModal } = useAuth();
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

  const handleSend = async (queryText?: string) => {
    if (!isAuthenticated) {
      openAuthModal("login");
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
      const agentMsg: AgentChatMessage = {
        id: `agent-${Date.now()}`,
        role: "agent",
        content: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        stocks: res.recommendedStocks,
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err: unknown) {
      const errorMsg: AgentChatMessage = {
        id: `agent-err-${Date.now()}`,
        role: "agent",
        content: `⚠️ Apologies, could not complete the query: ${err instanceof Error ? err.message : "Network error"}. Please try again.`,
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
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary text-sm font-bold border border-primary/25">
            🤖
          </span>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              NEPSE AI Agent Assistant
              <span className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 px-2 py-0.2 text-[10px] font-bold uppercase">
                Active Scanner
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground">Ask anything about market setups, stocks to buy/sell, or your watchlist</p>
          </div>
        </div>

        {messages.length > 1 && (
          <button
            onClick={() => setMessages(messages.slice(0, 1))}
            className="text-xs text-muted-foreground hover:text-foreground underline"
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
            disabled={isLoading}
            className="rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

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
            placeholder="Ask the Agent (e.g. Which banking stock should I buy today? Is NABIL a buy or sell?)..."
            disabled={isLoading}
            className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <span>Send</span>
          </button>
        </form>
      )}
    </div>
  );
}
