"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageContainer, PageHeader, ResponsiveCard } from "@/shared/ui";

const POPULAR_BROKERS = [
  { id: 58, name: "Naasa Securities" },
  { id: 45, name: "Imperial Securities" },
  { id: 34, name: "Vision Securities" },
  { id: 28, name: "Shweta Securities" },
  { id: 49, name: "Online Securities" },
  { id: 57, name: "Aryatara Securities" },
  { id: 42, name: "Sani Securities" },
  { id: 38, name: "Dipshikha Dhitopatra" },
  { id: 19, name: "Nepal Investment Securities" },
  { id: 14, name: "Premier Securities" },
];

export default function BrokerIndexPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const valid = Number.isInteger(Number(id)) && Number(id) > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (valid) router.push(`/broker/${id}`);
  };

  return (
    <PageContainer maxWidth="narrow">
      <div className="space-y-6">
        <PageHeader
          title="Broker Analytics & Intelligence"
          description="Institutional flow profiling, top net accumulation scrips, and sector rotation analysis by broker firm."
          icon="🏛️"
        />

        <ResponsiveCard>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Enter Broker Number
              </span>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Broker number, e.g. 58"
                  className="w-full sm:flex-1 rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono font-bold"
                />
                <button
                  type="submit"
                  disabled={!valid}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-xs hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <span>Open Broker Profile</span>
                  <span>→</span>
                </button>
              </div>
            </label>
          </form>

          <div className="mt-6 border-t border-border/60 pt-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-3">
              Popular NEPSE Brokers Quick Pick
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {POPULAR_BROKERS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => router.push(`/broker/${b.id}`)}
                  className="flex items-center justify-between rounded-xl border border-border/80 bg-surface/80 p-2.5 text-xs text-left hover:border-primary/50 hover:bg-muted/40 transition-all group cursor-pointer"
                >
                  <span className="truncate pr-1">
                    <strong className="font-mono text-primary group-hover:underline">#{b.id}</strong>{" "}
                    <span className="text-muted-foreground text-[11px]">{b.name}</span>
                  </span>
                  <span className="text-muted-foreground group-hover:text-primary transition-colors">→</span>
                </button>
              ))}
            </div>
          </div>
        </ResponsiveCard>
      </div>
    </PageContainer>
  );
}
