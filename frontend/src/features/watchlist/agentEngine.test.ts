import { describe, expect, it } from "vitest";
import {
  answerAgentQuery,
  DEFAULT_ANNOUNCEMENTS,
  DEFAULT_DIVIDENDS,
  DEFAULT_UNIVERSE,
  evaluateStock,
  scanMarketUniverse,
} from "../ai/agentEngine";
import type { RawStockSnapshot } from "../ai/agentEngine";

describe("agentEngine - evaluateStock", () => {
  it("classifies high-scoring bullish scrip as BUY with trade plan", () => {
    const stock: RawStockSnapshot = {
      symbol: "TESTBUY",
      close: 500,
      change_pct: 2.5,
      rsi_14: 62,
      sma_20: 480,
      sma_50: 460,
      sma_200: 440,
      top3_broker_accum_15d_pct: 45,
      high_52w: 550,
      low_52w: 380,
    };

    const evaluation = evaluateStock(stock, [], []);
    expect(evaluation.action).toBe("BUY");
    expect(evaluation.confidenceScore).toBeGreaterThanOrEqual(70);
    expect(evaluation.tradePlan).toBeDefined();
    expect(evaluation.tradePlan!.stopLoss).toBeLessThan(stock.close);
    expect(evaluation.tradePlan!.target1).toBeGreaterThan(stock.close);
    expect(evaluation.tradePlan!.target2).toBeGreaterThan(evaluation.tradePlan!.target1);
  });

  it("classifies overbought scrip with high RSI as SELL / AVOID", () => {
    const stock: RawStockSnapshot = {
      symbol: "TESTSELL",
      close: 800,
      change_pct: -1.2,
      rsi_14: 82, // overbought
      sma_20: 740,
      sma_50: 700,
      sma_200: 600,
      top3_broker_accum_15d_pct: 12, // distribution
      high_52w: 810,
      low_52w: 400,
    };

    const evaluation = evaluateStock(stock, [], []);
    expect(evaluation.action).toBe("SELL");
    expect(evaluation.confidenceScore).toBeLessThan(50);
  });

  it("classifies consolidating scrip as WATCHLIST with trigger notes", () => {
    const stock: RawStockSnapshot = {
      symbol: "TESTWATCH",
      close: 300,
      change_pct: 0.2,
      rsi_14: 48,
      sma_20: 298,
      sma_50: 295,
      sma_200: 310,
      top3_broker_accum_15d_pct: 26,
      high_52w: 400,
      low_52w: 250,
    };

    const evaluation = evaluateStock(stock, [], []);
    expect(evaluation.action).toBe("WATCHLIST");
    expect(evaluation.tradePlan).toBeDefined();
    expect(evaluation.tradePlan!.triggerCondition).toContain("watchlist");
  });

  it("matches corporate dividend and announcement catalysts", () => {
    const stock: RawStockSnapshot = {
      symbol: "NABIL",
      close: 580,
    };
    const dividends = [
      { symbol: "NABIL", bonus_pct: 10, cash_pct: 0.5, book_closure_date: "2026-11-10" },
    ];
    const announcements = [
      { title: "Nabil Bank Limited (NABIL) 40th AGM Notice", published_on: "2026-10-20" },
    ];

    const evaluation = evaluateStock(stock, announcements, dividends);
    expect(evaluation.catalysts.length).toBeGreaterThanOrEqual(1);
    expect(evaluation.catalysts.some((c) => c.type === "dividend")).toBe(true);
  });
});

describe("agentEngine - scanMarketUniverse & generateMarketBriefing", () => {
  it("scans default universe and generates briefing with top picks", () => {
    const scan = scanMarketUniverse(DEFAULT_UNIVERSE, DEFAULT_ANNOUNCEMENTS, DEFAULT_DIVIDENDS);

    expect(scan.stocks.length).toBe(DEFAULT_UNIVERSE.length);
    expect(scan.topBuys.length).toBeGreaterThan(0);
    expect(scan.topWatchlist.length).toBeGreaterThan(0);
    expect(scan.topSells.length).toBeGreaterThan(0);

    const b = scan.briefing;
    expect(b.totalStocksScanned).toBe(DEFAULT_UNIVERSE.length);
    expect(b.buyCount + b.watchlistCount + b.sellCount).toBe(DEFAULT_UNIVERSE.length);
    expect(b.executiveBrief.length).toBeGreaterThan(10);
    expect(b.tacticalStrategy.length).toBeGreaterThan(10);
  });
});

describe("agentEngine - answerAgentQuery", () => {
  const scan = scanMarketUniverse(DEFAULT_UNIVERSE, DEFAULT_ANNOUNCEMENTS, DEFAULT_DIVIDENDS);

  it("answers query about a specific stock", () => {
    const res = answerAgentQuery("Is NABIL good to buy or should I wait?", scan, []);
    expect(res.recommendedStocks[0].symbol).toBe("NABIL");
    expect(res.answer).toContain("NABIL");
  });

  it("answers query about broker accumulation", () => {
    const res = answerAgentQuery("Which stocks have highest broker accumulation?", scan, []);
    expect(res.recommendedStocks.length).toBeGreaterThan(0);
    expect(res.answer.toLowerCase()).toContain("broker");
  });

  it("answers query about dividends", () => {
    const res = answerAgentQuery("Show me dividend stocks to watchlist", scan, []);
    expect(res.recommendedStocks.length).toBeGreaterThan(0);
    expect(res.answer.toLowerCase()).toContain("dividend");
  });

  it("answers query about user watchlist when empty", () => {
    const res = answerAgentQuery("Review my watchlist", scan, []);
    expect(res.answer).toContain("empty");
  });

  it("answers query about user watchlist when populated", () => {
    const res = answerAgentQuery("Review my watchlist", scan, ["NABIL", "GBIME"]);
    expect(res.recommendedStocks.some((s) => s.symbol === "NABIL")).toBe(true);
  });
});
