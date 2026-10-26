import { describe, expect, it } from "vitest";
import type { NewsItem } from "./types";

describe("News feature data contracts", () => {
  it("structures news item with AI impact fields properly", () => {
    const item: NewsItem = {
      id: 101,
      title: "Nabil Bank proposes 14.5% dividend",
      summary: "Board approves 10% bonus share and 4.5% cash dividend.",
      source: "ShareSansar",
      source_url: "https://www.sharesansar.com/newsdetail/nabil",
      category: "company",
      published_on: "2026-10-26",
      symbols: ["NABIL"],
      sector: "Commercial Banks",
      impact_stance: "BULLISH",
      impact_score: 65,
      action_recommendation: "BUY BEFORE BOOK CLOSURE / ACCUMULATE",
      action_detail: "Strong dividend yield opportunity before register close.",
      sentiment_label: "POSITIVE",
      time_horizon: "SHORT_TERM",
      confidence: 85,
    };

    expect(item.symbols).toContain("NABIL");
    expect(item.impact_stance).toBe("BULLISH");
    expect(item.impact_score).toBeGreaterThan(0);
    expect(item.action_recommendation).toContain("BUY");
  });

  it("handles regulatory categorisation for SEBON and NRB notices", () => {
    const regulatoryItem: NewsItem = {
      id: 102,
      title: "SEBON clarifies margin loan valuation norms",
      summary: "Directives to maintain 120-day average price baseline.",
      source: "SEBON",
      source_url: "https://sebon.gov.np/notices/102",
      category: "regulatory",
      published_on: "2026-10-25",
      symbols: [],
      sector: "General Market",
      impact_stance: "NEUTRAL",
      impact_score: 10,
      action_recommendation: "HOLD & MONITOR",
      action_detail: "Observe secondary market liquidity response.",
      sentiment_label: "NEUTRAL",
      time_horizon: "SHORT_TERM",
      confidence: 80,
    };

    expect(regulatoryItem.category).toBe("regulatory");
    expect(regulatoryItem.symbols).toHaveLength(0);
    expect(regulatoryItem.impact_stance).toBe("NEUTRAL");
  });
});
