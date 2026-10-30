import { describe, expect, it } from "vitest";
import {
  evaluatePortfolioHolding,
  scanPortfolio,
  answerPortfolioAgentQuery,
} from "./portfolioAgentEngine";
import type { Holding } from "./types";

describe("portfolioAgentEngine", () => {
  const sampleHoldings: Holding[] = [
    {
      symbol: "NABIL",
      qty: 100,
      wacc: "480.00",
      total_cost: "48000.00",
      ltp: "610.00",
      market_value: "61000.00",
      unrealized_pnl: "13000.00",
      day_change: "5.00",
    },
    {
      symbol: "UPPER",
      qty: 200,
      wacc: "260.00",
      total_cost: "52000.00",
      ltp: "215.00",
      market_value: "43000.00",
      unrealized_pnl: "-9000.00",
      day_change: "-2.00",
    },
    {
      symbol: "CHCL",
      qty: 80,
      wacc: "490.00",
      total_cost: "39200.00",
      ltp: "505.00",
      market_value: "40400.00",
      unrealized_pnl: "1200.00",
      day_change: "3.50",
    },
  ];

  it("evaluates a winning overbought holding as SELL / Take Profit", () => {
    const holding: Holding = {
      symbol: "NABIL",
      qty: 100,
      wacc: "450.00",
      total_cost: "45000.00",
      ltp: "600.00", // +33% gain
      market_value: "60000.00",
      unrealized_pnl: "15000.00",
      day_change: "10.00",
    };

    const evaluation = evaluatePortfolioHolding(holding, 200000, {
      NABIL: { symbol: "NABIL", ltp: 600, rsi_14: 75, sma_20: 570, sma_50: 540, sma_200: 500 },
    });

    expect(evaluation.action).toBe("SELL");
    expect(evaluation.unrealizedPnlPct).toBeGreaterThan(25);
    expect(evaluation.actionPlan.suggestedTrimQty).toBeGreaterThan(0);
  });

  it("evaluates high concentration risk as SELL / Trim", () => {
    const holding: Holding = {
      symbol: "SHIVM",
      qty: 1000,
      wacc: "500.00",
      total_cost: "500000.00",
      ltp: "510.00",
      market_value: "510000.00",
      unrealized_pnl: "10000.00",
      day_change: "2.00",
    };

    // 510,000 out of 1,000,000 is 51% concentration!
    const evaluation = evaluatePortfolioHolding(holding, 1000000);
    expect(evaluation.action).toBe("SELL");
    expect(evaluation.signals.concentrationRisk).toBe("high");
    expect(evaluation.primaryReason).toContain("Concentration Risk");
  });

  it("evaluates an oversold drawdown with broker support as BUY_MORE", () => {
    const holding: Holding = {
      symbol: "UPPER",
      qty: 100,
      wacc: "235.00",
      total_cost: "23500.00",
      ltp: "215.00", // -8.5%
      market_value: "21500.00",
      unrealized_pnl: "-2000.00",
      day_change: "-1.00",
    };

    const evaluation = evaluatePortfolioHolding(holding, 300000, {
      UPPER: { symbol: "UPPER", ltp: 215, rsi_14: 34, top3_broker_accum_15d_pct: 45 },
    });

    expect(evaluation.action).toBe("BUY_MORE");
    expect(evaluation.actionPlan.accumulationZone).toBeDefined();
  });

  it("evaluates a steady momentum uptrend as WAIT / HOLD", () => {
    const holding: Holding = {
      symbol: "CHCL",
      qty: 100,
      wacc: "480.00",
      total_cost: "48000.00",
      ltp: "525.00", // +9.3%
      market_value: "52500.00",
      unrealized_pnl: "4500.00",
      day_change: "2.00",
    };

    const evaluation = evaluatePortfolioHolding(holding, 300000, {
      CHCL: { symbol: "CHCL", ltp: 525, rsi_14: 58, sma_20: 510, sma_50: 495, sma_200: 460 },
    });

    expect(evaluation.action).toBe("WAIT");
    expect(evaluation.actionPlan.stopLossPrice).toBeDefined();
  });

  it("generates portfolio health report with sector diversification", () => {
    const scan = scanPortfolio(sampleHoldings);
    expect(scan.report.overallHealthScore).toBeGreaterThan(0);
    expect(scan.report.sectorDiversification.length).toBeGreaterThan(0);
    expect(scan.evaluations.length).toBe(3);
  });

  it("answers user agent queries regarding specific stocks", () => {
    const scan = scanPortfolio(sampleHoldings);
    const answer = answerPortfolioAgentQuery("Should I sell NABIL?", scan);
    expect(answer).toContain("NABIL");
    expect(answer).toContain("Position");
  });

  it("answers general queries about what to sell", () => {
    const scan = scanPortfolio(sampleHoldings);
    const answer = answerPortfolioAgentQuery("What should I sell right now?", scan);
    expect(answer).toBeDefined();
    expect(typeof answer).toBe("string");
  });
});
