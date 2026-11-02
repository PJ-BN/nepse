export interface TokenUsageStats {
  total_runs: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
}

export interface AdminOverview {
  current_time_npt: string;
  total_users: number;
  data_sources: {
    total: number;
    healthy: number;
    active: number;
  };
  daily_evening_job: {
    schedule_time_npt: string;
    is_enabled: boolean;
    last_status: string;
    last_run_at: string | null;
    last_duration_sec: number;
  };
  token_usage: TokenUsageStats;
  database: {
    active_companies: number;
    daily_bars_count: number;
    total_news: number;
    latest_trade_date: string;
  };
}

export interface AdminUser {
  id: number;
  email: string;
  role: "admin" | "user";
  is_active: boolean;
  created_at: string | null;
  last_login_at: string | null;
}

export interface DataSource {
  id: string;
  name: string;
  category: string;
  priority: number;
  is_enabled: boolean;
  rate_limit_delay_ms: number;
  timeout_sec: number;
  health_status: "HEALTHY" | "DEGRADED" | "DOWN";
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_msg: string | null;
  config: Record<string, unknown>;
}

export interface ScheduledJob {
  id: string;
  name: string;
  description: string | null;
  cron_expr: string;
  schedule_time_npt: string;
  days_of_week: string;
  is_enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  last_status: string;
  last_duration_sec: number;
}

export interface JobExecutionLog {
  id: number;
  job_id: string;
  triggered_by: string;
  status: "RUNNING" | "SUCCESS" | "FAILED";
  started_at: string;
  finished_at: string | null;
  duration_sec: number;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  summary: Record<string, unknown>;
  error_details: string | null;
}

export interface AiAgentConfig {
  agent_id: string;
  name: string;
  model_provider: string;
  model_slug: string;
  is_enabled: boolean;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  user_prompt_template: string;
}

export interface OpenRouterConfig {
  is_configured: boolean;
  masked_key: string;
  default_model: string;
  monthly_budget_usd: number;
}
