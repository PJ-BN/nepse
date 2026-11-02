"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth";
import { AdminOverviewTab } from "./AdminOverviewTab";
import { AdminUsersTab } from "./AdminUsersTab";
import { AdminAiTab } from "./AdminAiTab";
import { AdminDataSourcesTab } from "./AdminDataSourcesTab";
import { AdminSchedulesTab } from "./AdminSchedulesTab";

export function AdminPortal() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("overview");

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // RBAC Access Guard
  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-rose-500/25 bg-card p-8 text-center shadow-lg my-12 space-y-4">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/10 text-2xl text-rose-500">
          🔒
        </div>
        <h2 className="text-lg font-bold text-foreground">Access Restricted</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The Admin Control Center requires administrative privileges. If you are an administrator, please sign in with
          your admin credentials.
        </p>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "users", label: "User Management", icon: "👥" },
    { id: "ai", label: "AI & OpenRouter", icon: "🤖" },
    { id: "data-sources", label: "Data Sources", icon: "⚡" },
    { id: "schedules", label: "Schedules & Sync", icon: "🕒" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Admin Control Center</h1>
            <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 text-[10px] font-bold text-purple-400 uppercase tracking-wider">
              Superadmin
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Global management for users, AI models, data source connectors, and automated 4:00 PM evening runs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Signed in as:</span>
          <span className="rounded-lg border border-border/80 bg-muted/30 px-2.5 py-1 text-xs font-semibold text-foreground">
            {user.email}
          </span>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border/70 bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "overview" && <AdminOverviewTab onSwitchTab={setActiveTab} />}
        {activeTab === "users" && <AdminUsersTab />}
        {activeTab === "ai" && <AdminAiTab />}
        {activeTab === "data-sources" && <AdminDataSourcesTab />}
        {activeTab === "schedules" && <AdminSchedulesTab />}
      </div>
    </div>
  );
}
