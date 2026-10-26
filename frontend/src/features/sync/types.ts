export interface SyncStatus {
  is_syncing: boolean;
  latest_trade_date: string | null;
  daily_bars_count: number;
  floorsheet_count: number;
  active_companies: number;
  total_news_articles: number;
  last_sync: {
    status: "idle" | "running" | "success" | "error";
    last_run: string | null;
    last_job: string | null;
    details: Record<string, unknown> | null;
  };
  current_time_npt: string;
}

export interface SyncResult {
  status: "success" | "error";
  job: string;
  business_date?: string;
  companies?: number;
  daily_bars?: number;
  index_bars?: number;
  floorsheet_ticks?: number;
  articles_ingested?: number;
  records_ingested?: number;
  compared?: number;
  mismatches?: string[];
  missing_in_store?: string[];
  summary?: Record<string, unknown>;
  timestamp: string;
}
