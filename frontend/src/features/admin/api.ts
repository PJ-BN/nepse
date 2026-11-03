import { getAuthToken } from "@/features/auth/tokenStorage";
import type {
  AdminOverview,
  AdminUser,
  AiAgentConfig,
  DataSource,
  JobExecutionLog,
  OpenRouterConfig,
  ScheduledJob,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

function authHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const res = await fetch(`${API_BASE}/api/v1/admin/overview`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Overview fetch failed: ${res.statusText}`);
  return res.json();
}

export async function fetchAdminUsers(search?: string, role?: string, limit = 50, offset = 0): Promise<{ users: AdminUser[]; total: number }> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (search) params.append("search", search);
  if (role) params.append("role", role);

  const res = await fetch(`${API_BASE}/api/v1/admin/users?${params.toString()}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function updateUserRole(userId: number, role: "admin" | "user"): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update role");
  }
}

export async function updateUserStatus(userId: number, isActive: boolean): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/admin/users/${userId}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ is_active: isActive }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update user status");
  }
}

export async function deleteUser(userId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to delete user");
  }
}

export async function fetchDataSources(): Promise<DataSource[]> {
  const res = await fetch(`${API_BASE}/api/v1/admin/data-sources`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch data sources");
  return res.json();
}

export async function updateDataSource(sourceId: string, updates: Partial<DataSource>): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/admin/data-sources/${sourceId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update data source");
}

export async function testDataSourceHealth(sourceId: string): Promise<{ status: string; latency_ms: number; http_status?: number; error?: string }> {
  const res = await fetch(`${API_BASE}/api/v1/admin/data-sources/${sourceId}/test`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to test source");
  return res.json();
}

export async function fetchAiConfig(): Promise<{ openrouter: OpenRouterConfig; agents: AiAgentConfig[]; token_usage: import("./types").TokenUsageStats }> {
  const res = await fetch(`${API_BASE}/api/v1/admin/ai/config`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch AI config");
  return res.json();
}

export async function updateOpenRouterConfig(body: { api_key?: string; default_model?: string; monthly_budget_usd?: number }): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/admin/ai/config`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update OpenRouter settings");
}

export async function updateAgentConfig(agentId: string, updates: Partial<AiAgentConfig>): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/admin/ai/agents/${agentId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update agent config");
}

export async function fetchSchedules(): Promise<ScheduledJob[]> {
  const res = await fetch(`${API_BASE}/api/v1/admin/schedules`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch schedules");
  return res.json();
}

export async function updateSchedule(jobId: string, updates: Partial<ScheduledJob>): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/admin/schedules/${jobId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update schedule");
}

export async function runJobManually(jobId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/api/v1/admin/schedules/${jobId}/run`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    let errMsg = "";
    try {
      const text = await res.text();
      try {
        const err = JSON.parse(text);
        errMsg = err.detail || err.message || err.error || (typeof err === "string" ? err : JSON.stringify(err));
      } catch {
        errMsg = text && text.length < 300 ? text : `HTTP ${res.status}: ${res.statusText || "Request failed"}`;
      }
    } catch {
      errMsg = `HTTP ${res.status}: ${res.statusText || "Request failed"}`;
    }
    throw new Error(errMsg || "Manual execution failed");
  }
  return res.json();
}

export async function fetchExecutionLogs(limit = 30): Promise<JobExecutionLog[]> {
  const res = await fetch(`${API_BASE}/api/v1/admin/schedules/logs?limit=${limit}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch execution logs");
  return res.json();
}
