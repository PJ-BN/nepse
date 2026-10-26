export type ImpactStance = "BULLISH" | "BEARISH" | "NEUTRAL" | "WATCH";
export type SentimentLabel = "POSITIVE" | "NEGATIVE" | "NEUTRAL";
export type TimeHorizon = "IMMEDIATE" | "SHORT_TERM" | "MEDIUM_TERM";
export type NewsCategory = "all" | "regulatory" | "government" | "company" | "macro" | "sector" | "market";

export interface NewsItem {
  id: number;
  title: string;
  summary: string;
  content?: string;
  source: string;
  source_url: string;
  category: string;
  published_on: string;
  symbols: string[];
  sector?: string | null;
  impact_stance: ImpactStance;
  impact_score: number;
  action_recommendation: string;
  action_detail: string;
  sentiment_label: SentimentLabel;
  time_horizon: TimeHorizon;
  confidence: number;
  created_at?: string;
}

export interface NewsFeedResponse {
  items: NewsItem[];
  total: number;
  limit: number;
  offset: number;
  category?: string | null;
  symbol?: string | null;
}

export interface NewsBriefing {
  headline: string;
  market_stance: ImpactStance;
  summary: string;
  regulatory_takeaway: string;
  top_opportunities: string[];
  top_risks: string[];
  sector_outlook: Record<string, string>;
  generated_at: string;
}

export interface NewsFilterState {
  category: string;
  symbol?: string;
  search?: string;
  stance?: string;
  page: number;
  limit: number;
}

export interface NewsAiEvaluation {
  news_id: number;
  title: string;
  impact_stance: ImpactStance;
  impact_score: number;
  action_recommendation: string;
  actionable_playbook: string;
  target_horizon: string;
  affected_symbols: string[];
  affected_sectors: string[];
  catalysts: string[];
  risks_to_watch: string[];
  investor_checklist: string[];
  analyzed_at: string;
  source: "agy" | "heuristic";
}
