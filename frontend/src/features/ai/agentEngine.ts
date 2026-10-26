import type {
  AgentAction,
  AgentScanResult,
  MarketAgentBriefing,
  SignalBreakdown,
  StockAgentEvaluation,
  StockCatalyst,
  TradeSetup,
  UrgencyLevel,
} from "./agentTypes";

export type RawStockSnapshot = {
  symbol: string;
  name?: string;
  sector?: string;
  close: number;
  change_pct?: number;
  volume?: number;
  turnover?: number;
  market_cap?: number;
  rsi_14?: number;
  sma_20?: number;
  sma_50?: number;
  sma_200?: number;
  atr_pct?: number;
  high_52w?: number;
  low_52w?: number;
  rsi_bull_div?: number;
  top3_broker_accum_15d_pct?: number;
  eps?: number;
  bvps?: number;
  pe?: number;
  pbv?: number;
  graham_number?: number;
  trade_date?: string;
};

export type RawAnnouncement = {
  title: string;
  url?: string;
  published_on?: string;
};

export type RawDividend = {
  symbol: string;
  name?: string;
  bonus_pct?: number;
  cash_pct?: number;
  book_closure_date?: string;
  announced_on?: string;
};

// Known NEPSE company names & sectors mapping
export const COMPANY_CATALOG: Record<string, { name: string; sector: string }> = {
  NABIL: { name: "Nabil Bank Limited", sector: "Commercial Banks" },
  GBIME: { name: "Global IME Bank Limited", sector: "Commercial Banks" },
  EBL: { name: "Everest Bank Limited", sector: "Commercial Banks" },
  NICA: { name: "NIC Asia Bank Limited", sector: "Commercial Banks" },
  SCB: { name: "Standard Chartered Bank Nepal", sector: "Commercial Banks" },
  SANIMA: { name: "Sanima Bank Limited", sector: "Commercial Banks" },
  PCBL: { name: "Prime Commercial Bank Limited", sector: "Commercial Banks" },
  KBL: { name: "Kumari Bank Limited", sector: "Commercial Banks" },
  PRVU: { name: "Prabhu Bank Limited", sector: "Commercial Banks" },
  SBI: { name: "Nepal SBI Bank Limited", sector: "Commercial Banks" },
  ADBL: { name: "Agricultural Development Bank", sector: "Commercial Banks" },
  CHCL: { name: "Chilime Hydropower Co.", sector: "Hydropower" },
  UPPER: { name: "Upper Tamakoshi Hydropower", sector: "Hydropower" },
  SHIVM: { name: "Shivam Cements Limited", sector: "Manufacturing & Processing" },
  HDL: { name: "Himalayan Distillery Limited", sector: "Manufacturing & Processing" },
  UNL: { name: "Unilever Nepal Limited", sector: "Manufacturing & Processing" },
  CIT: { name: "Citizen Investment Trust", sector: "Investment" },
  HIDCL: { name: "Hydroelectricity Investment & Dev", sector: "Investment" },
  NTC: { name: "Nepal Telecom", sector: "Others" },
  HRL: { name: "Himalayan Reinsurance Limited", sector: "Others" },
  NRIC: { name: "Nepal Reinsurance Company", sector: "Others" },
  RADHI: { name: "Radhi Bidyut Company", sector: "Hydropower" },
  AHPC: { name: "Arun Valley Hydropower", sector: "Hydropower" },
  API: { name: "Api Power Company Limited", sector: "Hydropower" },
  MEN: { name: "Mountain Energy Nepal", sector: "Hydropower" },
  NLIC: { name: "Nepal Life Insurance Co.", sector: "Life Insurance" },
  LICN: { name: "Life Insurance Corp Nepal", sector: "Life Insurance" },
  NICL: { name: "Nepal Insurance Company", sector: "Non Life Insurance" },
  IGI: { name: "IGI Prudential Insurance", sector: "Non Life Insurance" },
  NLG: { name: "NLG Insurance Company", sector: "Non Life Insurance" },
  CBBL: { name: "Chhimek Laghubitta Bittiya Sanstha", sector: "Microfinance" },
  DDBL: { name: "Deprosc Laghubitta Bittiya Sanstha", sector: "Microfinance" },
  SKBBL: { name: "Sana Kisan Bikas Laghubitta", sector: "Microfinance" },
  MLBSL: { name: "Mahila Laghubitta Bittiya Sanstha", sector: "Microfinance" },
  SHINE: { name: "Shine Resunga Development Bank", sector: "Development Banks" },
  MNBBL: { name: "Muktinath Bikas Bank", sector: "Development Banks" },
  GBBL: { name: "Garima Bikas Bank", sector: "Development Banks" },
  JBBL: { name: "Jyoti Bikas Bank", sector: "Development Banks" },
  CFCL: { name: "Central Finance Limited", sector: "Finance" },
  GFCL: { name: "Goodwill Finance Limited", sector: "Finance" },
  MFIL: { name: "Manjushree Finance Limited", sector: "Finance" },
  STC: { name: "Salt Trading Corporation", sector: "Trading" },
  BBC: { name: "Bishal Bazar Company", sector: "Trading" },
};

// High-fidelity fallback universe with realistic NEPSE technical & fundamental setups
export const DEFAULT_UNIVERSE: RawStockSnapshot[] = [
  {
    symbol: "NABIL",
    sector: "Commercial Banks",
    close: 585,
    change_pct: 1.74,
    volume: 184500,
    turnover: 107932500,
    market_cap: 158000000000,
    rsi_14: 62.4,
    sma_20: 565,
    sma_50: 540,
    sma_200: 512,
    atr_pct: 2.1,
    high_52w: 640,
    low_52w: 470,
    rsi_bull_div: 0,
    top3_broker_accum_15d_pct: 44.5,
    eps: 28.5,
    bvps: 224,
    pe: 20.5,
    pbv: 2.61,
    graham_number: 378,
  },
  {
    symbol: "GBIME",
    sector: "Commercial Banks",
    close: 268,
    change_pct: 2.29,
    volume: 245000,
    turnover: 65660000,
    market_cap: 96000000000,
    rsi_14: 58.2,
    sma_20: 254,
    sma_50: 242,
    sma_200: 228,
    atr_pct: 2.4,
    high_52w: 310,
    low_52w: 198,
    rsi_bull_div: 0,
    top3_broker_accum_15d_pct: 38.2,
    eps: 18.2,
    bvps: 184,
    pe: 14.7,
    pbv: 1.45,
    graham_number: 274,
  },
  {
    symbol: "EBL",
    sector: "Commercial Banks",
    close: 560,
    change_pct: 0.9,
    volume: 82000,
    turnover: 45920000,
    market_cap: 67000000000,
    rsi_14: 54.1,
    sma_20: 548,
    sma_50: 535,
    sma_200: 520,
    atr_pct: 1.8,
    high_52w: 615,
    low_52w: 485,
    rsi_bull_div: 0,
    top3_broker_accum_15d_pct: 36.0,
    eps: 32.4,
    bvps: 260,
    pe: 17.2,
    pbv: 2.15,
    graham_number: 435,
  },
  {
    symbol: "CHCL",
    sector: "Hydropower",
    close: 480,
    change_pct: 3.44,
    volume: 135000,
    turnover: 64800000,
    market_cap: 42000000000,
    rsi_14: 67.5,
    sma_20: 452,
    sma_50: 430,
    sma_200: 405,
    atr_pct: 2.8,
    high_52w: 525,
    low_52w: 360,
    rsi_bull_div: 1,
    top3_broker_accum_15d_pct: 46.8,
    eps: 19.8,
    bvps: 195,
    pe: 24.2,
    pbv: 2.46,
    graham_number: 294,
  },
  {
    symbol: "UPPER",
    sector: "Hydropower",
    close: 198,
    change_pct: -1.49,
    volume: 380000,
    turnover: 75240000,
    market_cap: 41000000000,
    rsi_14: 38.5,
    sma_20: 206,
    sma_50: 218,
    sma_200: 245,
    atr_pct: 3.2,
    high_52w: 310,
    low_52w: 185,
    rsi_bull_div: 1,
    top3_broker_accum_15d_pct: 34.0,
    eps: -4.2,
    bvps: 92,
    pe: 0,
    pbv: 2.15,
    graham_number: 0,
  },
  {
    symbol: "SHIVM",
    sector: "Manufacturing & Processing",
    close: 524,
    change_pct: 1.15,
    volume: 195000,
    turnover: 102180000,
    market_cap: 32000000000,
    rsi_14: 51.0,
    sma_20: 512,
    sma_50: 502,
    sma_200: 535,
    atr_pct: 2.6,
    high_52w: 685,
    low_52w: 430,
    rsi_bull_div: 1,
    top3_broker_accum_15d_pct: 41.2,
    eps: 12.8,
    bvps: 205,
    pe: 40.9,
    pbv: 2.55,
    graham_number: 243,
  },
  {
    symbol: "HDL",
    sector: "Manufacturing & Processing",
    close: 1680,
    change_pct: -2.32,
    volume: 24000,
    turnover: 40320000,
    market_cap: 39000000000,
    rsi_14: 34.2,
    sma_20: 1740,
    sma_50: 1860,
    sma_200: 2150,
    atr_pct: 2.9,
    high_52w: 2650,
    low_52w: 1590,
    rsi_bull_div: 0,
    top3_broker_accum_15d_pct: 14.5,
    eps: 31.0,
    bvps: 240,
    pe: 54.1,
    pbv: 7.0,
    graham_number: 409,
  },
  {
    symbol: "CIT",
    sector: "Investment",
    close: 2420,
    change_pct: 1.89,
    volume: 28000,
    turnover: 67760000,
    market_cap: 110000000000,
    rsi_14: 64.0,
    sma_20: 2340,
    sma_50: 2260,
    sma_200: 2180,
    atr_pct: 1.9,
    high_52w: 2650,
    low_52w: 1950,
    rsi_bull_div: 0,
    top3_broker_accum_15d_pct: 45.0,
    eps: 48.0,
    bvps: 340,
    pe: 50.4,
    pbv: 7.11,
    graham_number: 606,
  },
  {
    symbol: "HIDCL",
    sector: "Investment",
    close: 194,
    change_pct: 0.52,
    volume: 320000,
    turnover: 62080000,
    market_cap: 48000000000,
    rsi_14: 48.0,
    sma_20: 191,
    sma_50: 188,
    sma_200: 182,
    atr_pct: 2.2,
    high_52w: 235,
    low_52w: 165,
    rsi_bull_div: 0,
    top3_broker_accum_15d_pct: 28.5,
    eps: 6.8,
    bvps: 115,
    pe: 28.5,
    pbv: 1.68,
    graham_number: 132,
  },
  {
    symbol: "NTC",
    sector: "Others",
    close: 840,
    change_pct: 0.24,
    volume: 45000,
    turnover: 37800000,
    market_cap: 151000000000,
    rsi_14: 46.5,
    sma_20: 835,
    sma_50: 842,
    sma_200: 865,
    atr_pct: 1.4,
    high_52w: 940,
    low_52w: 780,
    rsi_bull_div: 0,
    top3_broker_accum_15d_pct: 22.0,
    eps: 44.5,
    bvps: 560,
    pe: 18.8,
    pbv: 1.5,
    graham_number: 748,
  },
  {
    symbol: "NLIC",
    sector: "Life Insurance",
    close: 685,
    change_pct: 2.54,
    volume: 68000,
    turnover: 46580000,
    market_cap: 62000000000,
    rsi_14: 61.2,
    sma_20: 654,
    sma_50: 632,
    sma_200: 610,
    atr_pct: 2.3,
    high_52w: 750,
    low_52w: 540,
    rsi_bull_div: 0,
    top3_broker_accum_15d_pct: 42.1,
    eps: 16.4,
    bvps: 180,
    pe: 41.7,
    pbv: 3.8,
    graham_number: 257,
  },
  {
    symbol: "NICL",
    sector: "Non Life Insurance",
    close: 642,
    change_pct: 3.05,
    volume: 52000,
    turnover: 33384000,
    market_cap: 18000000000,
    rsi_14: 65.8,
    sma_20: 615,
    sma_50: 590,
    sma_200: 565,
    atr_pct: 2.5,
    high_52w: 710,
    low_52w: 495,
    rsi_bull_div: 0,
    top3_broker_accum_15d_pct: 48.0,
    eps: 24.2,
    bvps: 228,
    pe: 26.5,
    pbv: 2.81,
    graham_number: 352,
  },
  {
    symbol: "CBBL",
    sector: "Microfinance",
    close: 1040,
    change_pct: 1.96,
    volume: 38000,
    turnover: 39520000,
    market_cap: 36000000000,
    rsi_14: 59.4,
    sma_20: 1010,
    sma_50: 975,
    sma_200: 940,
    atr_pct: 2.2,
    high_52w: 1200,
    low_52w: 830,
    rsi_bull_div: 0,
    top3_broker_accum_15d_pct: 39.5,
    eps: 42.0,
    bvps: 285,
    pe: 24.7,
    pbv: 3.65,
    graham_number: 519,
  },
  {
    symbol: "SKBBL",
    sector: "Microfinance",
    close: 890,
    change_pct: 1.36,
    volume: 42000,
    turnover: 37380000,
    market_cap: 34000000000,
    rsi_14: 56.7,
    sma_20: 865,
    sma_50: 840,
    sma_200: 815,
    atr_pct: 2.0,
    high_52w: 1020,
    low_52w: 740,
    rsi_bull_div: 0,
    top3_broker_accum_15d_pct: 37.0,
    eps: 38.5,
    bvps: 265,
    pe: 23.1,
    pbv: 3.35,
    graham_number: 478,
  },
  {
    symbol: "MNBBL",
    sector: "Development Banks",
    close: 398,
    change_pct: 2.05,
    volume: 110000,
    turnover: 43780000,
    market_cap: 28000000000,
    rsi_14: 63.5,
    sma_20: 382,
    sma_50: 366,
    sma_200: 348,
    atr_pct: 2.4,
    high_52w: 450,
    low_52w: 310,
    rsi_bull_div: 0,
    top3_broker_accum_15d_pct: 43.0,
    eps: 18.5,
    bvps: 154,
    pe: 21.5,
    pbv: 2.58,
    graham_number: 253,
  },
  {
    symbol: "RADHI",
    sector: "Hydropower",
    close: 315,
    change_pct: 4.3,
    volume: 210000,
    turnover: 66150000,
    market_cap: 11000000000,
    rsi_14: 71.2,
    sma_20: 290,
    sma_50: 272,
    sma_200: 245,
    atr_pct: 3.8,
    high_52w: 330,
    low_52w: 215,
    rsi_bull_div: 0,
    top3_broker_accum_15d_pct: 51.2,
    eps: 12.0,
    bvps: 135,
    pe: 26.2,
    pbv: 2.33,
    graham_number: 191,
  },
  {
    symbol: "HRL",
    sector: "Others",
    close: 670,
    change_pct: 0.45,
    volume: 165000,
    turnover: 110550000,
    market_cap: 70000000000,
    rsi_14: 53.0,
    sma_20: 660,
    sma_50: 645,
    sma_200: 590,
    atr_pct: 2.2,
    high_52w: 745,
    low_52w: 520,
    rsi_bull_div: 0,
    top3_broker_accum_15d_pct: 35.5,
    eps: 14.5,
    bvps: 160,
    pe: 46.2,
    pbv: 4.18,
    graham_number: 228,
  },
  {
    symbol: "STC",
    sector: "Trading",
    close: 5350,
    change_pct: -3.6,
    volume: 8500,
    turnover: 45475000,
    market_cap: 17000000000,
    rsi_14: 31.8,
    sma_20: 5650,
    sma_50: 5900,
    sma_200: 6400,
    atr_pct: 3.4,
    high_52w: 7800,
    low_52w: 5100,
    rsi_bull_div: 0,
    top3_broker_accum_15d_pct: 12.0,
    eps: 62.0,
    bvps: 450,
    pe: 86.2,
    pbv: 11.8,
    graham_number: 792,
  },
  {
    symbol: "NICA",
    sector: "Commercial Banks",
    close: 435,
    change_pct: -0.68,
    volume: 115000,
    turnover: 50025000,
    market_cap: 68000000000,
    rsi_14: 42.0,
    sma_20: 442,
    sma_50: 458,
    sma_200: 515,
    atr_pct: 2.1,
    high_52w: 620,
    low_52w: 410,
    rsi_bull_div: 1,
    top3_broker_accum_15d_pct: 31.0,
    eps: 16.5,
    bvps: 195,
    pe: 26.3,
    pbv: 2.23,
    graham_number: 268,
  },
  {
    symbol: "API",
    sector: "Hydropower",
    close: 232,
    change_pct: 2.65,
    volume: 280000,
    turnover: 64960000,
    market_cap: 15000000000,
    rsi_14: 63.0,
    sma_20: 222,
    sma_50: 212,
    sma_200: 195,
    atr_pct: 3.1,
    high_52w: 260,
    low_52w: 165,
    rsi_bull_div: 0,
    top3_broker_accum_15d_pct: 44.0,
    eps: 8.5,
    bvps: 118,
    pe: 27.2,
    pbv: 1.96,
    graham_number: 150,
  },
];

// Sample corporate announcements matching NEPSE symbols
export const DEFAULT_ANNOUNCEMENTS: RawAnnouncement[] = [
  {
    title: "Nabil Bank Limited (NABIL) proposes 10.0% Bonus Share and 0.53% Cash Dividend for FY 2080/81",
    url: "https://sharesansar.com/announcement/nabil-dividend-proposal",
    published_on: "2026-10-24",
  },
  {
    title: "Chilime Hydropower (CHCL) 28th AGM scheduled on 2081-08-15; Book closure date fixed",
    url: "https://sharesansar.com/announcement/chcl-agm-book-closure",
    published_on: "2026-10-23",
  },
  {
    title: "Global IME Bank (GBIME) posts 24% Net Profit growth in Q1 Financials",
    url: "https://sharesansar.com/announcement/gbime-q1-report",
    published_on: "2026-10-22",
  },
  {
    title: "Radhi Bidyut Company (RADHI) signs PPA extension with Nepal Electricity Authority",
    url: "https://sharesansar.com/announcement/radhi-ppa-agreement",
    published_on: "2026-10-21",
  },
  {
    title: "Nepal Insurance Company (NICL) proposes 12.5% dividend from previous fiscal year reserves",
    url: "https://sharesansar.com/announcement/nicl-dividend",
    published_on: "2026-10-20",
  },
  {
    title: "Citizen Investment Trust (CIT) approves audited balance sheet and dividend declaration",
    url: "https://sharesansar.com/announcement/cit-dividend",
    published_on: "2026-10-18",
  },
  {
    title: "SEBON grants formal approval for Rights Offering to selected hydropower entities",
    url: "https://sharesansar.com/announcement/sebon-hydro-rights",
    published_on: "2026-10-17",
  },
];

export const DEFAULT_DIVIDENDS: RawDividend[] = [
  { symbol: "NABIL", bonus_pct: 10.0, cash_pct: 0.53, book_closure_date: "2026-11-12", announced_on: "2026-10-24" },
  { symbol: "CHCL", bonus_pct: 8.0, cash_pct: 2.0, book_closure_date: "2026-11-05", announced_on: "2026-10-23" },
  { symbol: "NICL", bonus_pct: 10.0, cash_pct: 2.5, book_closure_date: "2026-11-18", announced_on: "2026-10-20" },
  { symbol: "CIT", bonus_pct: 5.0, cash_pct: 8.5, book_closure_date: "2026-11-25", announced_on: "2026-10-18" },
  { symbol: "EBL", bonus_pct: 10.5, cash_pct: 5.0, book_closure_date: "2026-10-30", announced_on: "2026-10-10" },
];

// Helper to determine SMA alignment
function determineSmaPosition(close: number, sma20?: number, sma50?: number, sma200?: number): StockAgentEvaluation["smaPosition"] {
  if (!sma20 || !sma50) return "MIXED";
  if (sma200 && close > sma20 && sma20 > sma50 && sma50 > sma200) return "ABOVE_ALL";
  if (close > sma20 && sma20 > sma50) return "ABOVE_20_50";
  if (sma200 && close > sma200 && close < sma20) return "ABOVE_200";
  if (sma200 && close < sma20 && sma20 < sma50 && close < sma200) return "BELOW_ALL";
  if (close < sma20 && close < sma50) return "BELOW_ALL";
  return "MIXED";
}

// Extract matching news catalysts for a symbol
function findCatalystsForSymbol(
  symbol: string,
  announcements: RawAnnouncement[],
  dividends: RawDividend[]
): StockCatalyst[] {
  const catalysts: StockCatalyst[] = [];
  const upper = symbol.toUpperCase();
  const info = COMPANY_CATALOG[upper];
  const nameKeywords = info ? info.name.toLowerCase().split(" ").filter((w) => w.length > 3) : [];

  // Match dividends
  const divMatch = dividends.find((d) => d.symbol.toUpperCase() === upper);
  if (divMatch && ((divMatch.bonus_pct ?? 0) > 0 || (divMatch.cash_pct ?? 0) > 0)) {
    const parts: string[] = [];
    if (divMatch.bonus_pct) parts.push(`${divMatch.bonus_pct}% Bonus`);
    if (divMatch.cash_pct) parts.push(`${divMatch.cash_pct}% Cash`);
    const bcStr = divMatch.book_closure_date ? ` (Book Closure: ${divMatch.book_closure_date})` : "";
    catalysts.push({
      type: "dividend",
      headline: `Dividend Announced: ${parts.join(" + ")}${bcStr}`,
      impact: "bullish",
      date: divMatch.announced_on,
    });
  }

  // Match announcements
  for (const ann of announcements) {
    const t = ann.title.toUpperCase();
    const isDirectSymbol = t.includes(upper) || new RegExp(`\\b${upper}\\b`, "i").test(ann.title);
    const isNameMatch = nameKeywords.length > 0 && nameKeywords.some((kw) => ann.title.toLowerCase().includes(kw));

    if (isDirectSymbol || isNameMatch) {
      const lower = ann.title.toLowerCase();
      let impact: StockCatalyst["impact"] = "bullish";
      let type: StockCatalyst["type"] = "news";

      if (lower.includes("dividend") || lower.includes("bonus")) {
        type = "dividend";
        impact = "bullish";
      } else if (lower.includes("agm") || lower.includes("sgm") || lower.includes("book closure")) {
        type = "agm";
        impact = "bullish";
      } else if (lower.includes("right")) {
        type = "rights";
        impact = "neutral";
      } else if (lower.includes("profit") || lower.includes("financial")) {
        type = "earnings";
        impact = lower.includes("decline") || lower.includes("drop") ? "bearish" : "bullish";
      }

      catalysts.push({
        type,
        headline: ann.title,
        impact,
        date: ann.published_on,
        url: ann.url,
      });
    }
  }

  return catalysts;
}

// Generate realistic institutional Trade Plan
function buildTradePlan(stock: RawStockSnapshot, action: AgentAction): TradeSetup | undefined {
  if (action === "SELL") return undefined;

  const close = stock.close;
  const atrPct = stock.atr_pct || 2.5;
  const buffer = (close * (atrPct * 0.7)) / 100;

  let entryMin = Math.round(close - buffer * 0.8);
  const entryMax = Math.round(close + buffer * 0.4);
  if (entryMin >= entryMax) entryMin = Math.round(close * 0.98);

  // Stop loss placed below recent support / SMA20
  const stopLoss = Math.round(Math.min(close * 0.94, stock.sma_20 ? stock.sma_20 * 0.98 : close * 0.94));
  const riskAmount = close - stopLoss;
  const riskPct = Math.round(((close - stopLoss) / close) * 1000) / 10;

  // Multi-tier targets
  const target1 = Math.round(close + riskAmount * 1.6);
  const target1UpsidePct = Math.round(((target1 - close) / close) * 1000) / 10;

  const target2 = Math.round(close + riskAmount * 2.8);
  const target2UpsidePct = Math.round(((target2 - close) / close) * 1000) / 10;

  const target3 = Math.round(close + riskAmount * 4.2);
  const target3UpsidePct = Math.round(((target3 - close) / close) * 1000) / 10;

  const rrRatio = riskAmount > 0 ? (riskAmount * 2.8 / riskAmount).toFixed(1) : "2.5";
  const timeframe = action === "BUY" ? "Short/Swing (1-3 weeks)" : "Watchlist Trigger / Position";

  return {
    entryMin,
    entryMax,
    stopLoss,
    riskPct,
    target1,
    target1UpsidePct,
    target2,
    target2UpsidePct,
    target3,
    target3UpsidePct,
    riskReward: `1:${rrRatio}`,
    timeframe,
    triggerCondition: action === "BUY"
      ? `Enter on dip between NPR ${entryMin} - ${entryMax} or on high volume breakout.`
      : `Stalk on watchlist. Trigger buy when price consolidates above NPR ${Math.round(close * 1.02)} with expanding volume.`,
  };
}

// Evaluate an individual stock using multi-factor quant rules
export function evaluateStock(
  stock: RawStockSnapshot,
  announcements: RawAnnouncement[] = DEFAULT_ANNOUNCEMENTS,
  dividends: RawDividend[] = DEFAULT_DIVIDENDS
): StockAgentEvaluation {
  const upper = stock.symbol.toUpperCase();
  const meta = COMPANY_CATALOG[upper] || { name: stock.name || upper, sector: stock.sector || "Equities" };
  const name = stock.name || meta.name;
  const sector = stock.sector || meta.sector;
  const close = Number(stock.close || 0);
  const changePct = Number(stock.change_pct ?? 0);
  const rsi = Number(stock.rsi_14 ?? 50);
  const rsiBullDiv = Boolean(stock.rsi_bull_div);
  const accumPct = Number(stock.top3_broker_accum_15d_pct ?? 25);
  const smaPos = determineSmaPosition(close, stock.sma_20, stock.sma_50, stock.sma_200);

  // 52-Week Range position (0 to 100%)
  const high52 = stock.high_52w ?? close * 1.25;
  const low52 = stock.low_52w ?? close * 0.75;
  const rangeSpan = high52 - low52;
  const range52wPct = rangeSpan > 0 ? Math.round(((close - low52) / rangeSpan) * 100) : 50;

  // Catalysts
  const catalysts = findCatalystsForSymbol(upper, announcements, dividends);
  if (rsiBullDiv) {
    catalysts.unshift({
      type: "divergence",
      headline: "Bullish RSI Divergence: Price printed lower low while momentum RSI formed higher low.",
      impact: "bullish",
    });
  }
  if (accumPct >= 40) {
    catalysts.push({
      type: "broker_flow",
      headline: `Institutional Accumulation: Top 3 broker desks absorbed ${accumPct.toFixed(1)}% of 15-day volume.`,
      impact: "bullish",
    });
  }

  // --- MULTI-FACTOR CONFLUENCE SCORING (0 to 100) ---
  let score = 50;

  // 1. Technical Trend (±25)
  if (smaPos === "ABOVE_ALL") score += 20;
  else if (smaPos === "ABOVE_20_50") score += 12;
  else if (smaPos === "ABOVE_200") score += 6;
  else if (smaPos === "BELOW_ALL") score -= 18;

  // 2. Momentum & Divergence (±25)
  if (rsi >= 50 && rsi <= 68) score += 14; // Sweet momentum spot
  else if (rsi > 68 && rsi <= 76) score += 6; // Strong but warm
  else if (rsi > 78) score -= 22; // Overbought exhaustion risk
  else if (rsi < 35 && rsiBullDiv) score += 18; // Classic reversal bounce setup
  else if (rsi < 35 && !rsiBullDiv) score -= 8; // Falling knife

  if (rsiBullDiv) score += 12;

  // 3. Smart Money / Broker Flow (±20)
  if (accumPct >= 42) score += 16;
  else if (accumPct >= 35) score += 10;
  else if (accumPct < 20) score -= 12;

  // 4. Fundamental Valuation (±15)
  const pe = stock.pe ?? 0;
  const eps = stock.eps ?? 0;
  const graham = stock.graham_number ?? 0;
  if (pe > 0 && pe < 20) score += 8;
  if (pe > 55) score -= 8;
  if (eps > 20) score += 5;
  if (graham > close) score += 6;

  // 5. News & Catalysts (±15)
  const hasDiv = catalysts.some((c) => c.type === "dividend");
  const hasBullishNews = catalysts.some((c) => c.impact === "bullish");
  if (hasDiv) score += 10;
  if (hasBullishNews) score += 5;

  // Normalize score between 10 and 96
  score = Math.max(12, Math.min(96, Math.round(score)));

  // --- ACTION CLASSIFICATION ---
  let action: AgentAction = "WATCHLIST";
  let urgency: UrgencyLevel = "MONITOR";
  let headlineReason = "";
  let detailedAnalysis = "";

  if (score >= 70 && rsi <= 75) {
    action = "BUY";
    urgency = accumPct >= 40 || changePct > 1.5 ? "IMMEDIATE" : "ON_CONFIRMATION";
    headlineReason = rsiBullDiv
      ? "High-probability accumulation reversal backed by RSI divergence and broker flow."
      : smaPos === "ABOVE_ALL"
      ? "Strong multi-timeframe bullish trend with sustained institutional accumulation."
      : "Breakout momentum with favorable risk-reward and upcoming corporate catalyst.";
    detailedAnalysis = `${upper} displays a strong quantitative confluence score of ${score}/100. Price is holding firmly at NPR ${close} with ${accumPct.toFixed(1)}% volume absorption by top broker desks. Moving average alignment (${smaPos}) and RSI at ${rsi.toFixed(1)} offer favorable upside skew toward Target 1 (NPR ${Math.round(close * 1.08)}) with clear risk defined at NPR ${Math.round(close * 0.94)}.`;
  } else if (score <= 38 || rsi > 78 || (accumPct < 18 && smaPos === "BELOW_ALL")) {
    action = "SELL";
    urgency = rsi > 78 ? "IMMEDIATE" : "MONITOR";
    headlineReason = rsi > 78
      ? `Overbought warning (RSI ${rsi.toFixed(1)}); book profits into resistance.`
      : "Bearish structural trend and institutional distribution; avoid fresh exposure.";
    detailedAnalysis = `${upper} is facing elevated downside risk with a low confluence score of ${score}/100. ${
      rsi > 78
        ? `RSI at ${rsi.toFixed(1)} warns of imminent momentum exhaustion. Taking partial or full profit is advised.`
        : `Trading below key moving averages (${smaPos}) with broker distribution (${accumPct.toFixed(1)}%). Protect capital and sideline until a clear base is established.`
    }`;
  } else {
    action = "WATCHLIST";
    urgency = range52wPct > 75 || rsiBullDiv ? "ON_CONFIRMATION" : "MONITOR";
    headlineReason = range52wPct > 75
      ? "Consolidating near 52-week highs; stalk on watchlist for confirmed volume breakout."
      : rsiBullDiv
      ? "Forming a base near support; wait for volume trigger before taking entry."
      : "Neutral consolidation zone; keep on watchlist for sector rotation trigger.";
    detailedAnalysis = `${upper} is building structure at NPR ${close} (confluence score: ${score}/100). Momentum is neutral (RSI: ${rsi.toFixed(1)}) and price sits at ${range52wPct}% of its 52-week range. Stalk this scrip on your watchlist and await a confirmed close above NPR ${Math.round(close * 1.03)} before triggering a trade.`;
  }

  // Signals summary
  const signals: SignalBreakdown = {
    technicalTrend: smaPos === "ABOVE_ALL" || smaPos === "ABOVE_20_50" ? "bullish" : smaPos === "BELOW_ALL" ? "bearish" : "neutral",
    smartMoneyFlow: accumPct >= 38 ? "accumulating" : accumPct <= 20 ? "distributing" : "neutral",
    valuation: (pe > 0 && pe < 20) || (graham > close) ? "undervalued" : pe > 45 ? "overvalued" : "fair",
    newsSentiment: hasBullishNews ? "positive" : catalysts.some((c) => c.impact === "bearish") ? "cautious" : "neutral",
  };

  const tradePlan = buildTradePlan(stock, action);

  return {
    symbol: upper,
    name,
    sector,
    close,
    changePct,
    volume: stock.volume ?? 0,
    turnover: stock.turnover ?? 0,
    marketCap: stock.market_cap,
    action,
    confidenceScore: score,
    urgency,
    headlineReason,
    detailedAnalysis,
    rsi14: rsi,
    rsiBullDiv,
    smaPosition: smaPos,
    range52wPct,
    high52w: high52,
    low52w: low52,
    brokerAccumulationPct: accumPct,
    pe: stock.pe,
    pbv: stock.pbv,
    grahamNumber: stock.graham_number,
    eps: stock.eps,
    tradePlan,
    catalysts,
    signals,
  };
}

// Generate the market-wide briefing
export function generateMarketBriefing(evaluations: StockAgentEvaluation[]): MarketAgentBriefing {
  const buys = evaluations.filter((e) => e.action === "BUY");
  const watch = evaluations.filter((e) => e.action === "WATCHLIST");
  const sells = evaluations.filter((e) => e.action === "SELL");

  const avgBuyScore = buys.length ? Math.round(buys.reduce((acc, b) => acc + b.confidenceScore, 0) / buys.length) : 65;

  // Find top sector by average score
  const sectorScores: Record<string, { total: number; count: number }> = {};
  for (const e of evaluations) {
    if (!sectorScores[e.sector]) sectorScores[e.sector] = { total: 0, count: 0 };
    sectorScores[e.sector].total += e.confidenceScore;
    sectorScores[e.sector].count += 1;
  }
  let topSector = "Commercial Banks";
  let highestSectorAvg = 0;
  for (const [sec, data] of Object.entries(sectorScores)) {
    const avg = data.total / data.count;
    if (avg > highestSectorAvg) {
      highestSectorAvg = avg;
      topSector = sec;
    }
  }

  const buyRatio = evaluations.length ? buys.length / evaluations.length : 0.3;
  let regime: MarketAgentBriefing["marketRegime"] = "RANGE_BOUND";
  let brief = "";
  let strategy = "";

  if (buyRatio > 0.45) {
    regime = "BULLISH_TREND";
    brief = "Broad-based bullish momentum with expanding institutional turnover across core sectors. Multiple breakout setups confirmed.";
    strategy = "Aggressive swing trading: accumulate top conviction buys on intraday pullbacks into support zones.";
  } else if (buyRatio >= 0.25) {
    regime = "SELECTIVE_PULLBACK";
    brief = "Market is in a healthy consolidation phase. Institutional liquidity is highly selective, rotating toward high-dividend and undervalued large caps.";
    strategy = "Stock-picker market: prioritize scrips with verified broker accumulation (>38%) and upcoming book closures.";
  } else {
    regime = "BEARISH_CORRECTION";
    brief = "Defensive market conditions with distribution visible in extended mid/small caps. Cash preservation is prioritized.";
    strategy = "Capital preservation: trim overbought counters, honor tight stop losses, and maintain high cash reserves.";
  }

  return {
    marketRegime: regime,
    confidenceScore: avgBuyScore,
    totalStocksScanned: evaluations.length,
    buyCount: buys.length,
    watchlistCount: watch.length,
    sellCount: sells.length,
    executiveBrief: brief,
    topSectorPick: topSector,
    tacticalStrategy: strategy,
    evaluatedAt: new Date().toISOString(),
  };
}

// Perform full universe scan
export function scanMarketUniverse(
  stocks: RawStockSnapshot[] = DEFAULT_UNIVERSE,
  announcements: RawAnnouncement[] = DEFAULT_ANNOUNCEMENTS,
  dividends: RawDividend[] = DEFAULT_DIVIDENDS
): AgentScanResult {
  const rawList = stocks && stocks.length > 0 ? stocks : DEFAULT_UNIVERSE;
  const dataset = rawList.filter((s) => s && s.symbol && s.close != null && Number(s.close) > 0);
  const evaluations = (dataset.length > 0 ? dataset : DEFAULT_UNIVERSE).map((s) =>
    evaluateStock(s, announcements, dividends)
  );

  // Sort by confidence score descending
  evaluations.sort((a, b) => b.confidenceScore - a.confidenceScore);

  const topBuys = evaluations.filter((e) => e.action === "BUY").slice(0, 8);
  const topWatchlist = evaluations.filter((e) => e.action === "WATCHLIST").slice(0, 8);
  const topSells = evaluations.filter((e) => e.action === "SELL").slice(0, 6);

  const briefing = generateMarketBriefing(evaluations);

  return {
    briefing,
    stocks: evaluations,
    topBuys,
    topWatchlist,
    topSells,
    source: "heuristic",
  };
}

// Process natural language queries to the agent
export function answerAgentQuery(
  query: string,
  scanResult: AgentScanResult,
  userWatchlistSymbols: string[] = []
): { answer: string; recommendedStocks: StockAgentEvaluation[] } {
  const q = query.trim().toLowerCase();
  const all = scanResult.stocks;

  // 1. Specific symbol mentioned
  for (const s of all) {
    if (q.includes(s.symbol.toLowerCase())) {
      const isStarred = userWatchlistSymbols.includes(s.symbol);
      let thesis = `### ${s.symbol} (${s.name})\n\n`;
      thesis += `**Agent Recommendation:** **${s.action}** (Confluence Score: **${s.confidenceScore}/100**)\n\n`;
      thesis += `**Key Rationale:** ${s.headlineReason}\n\n`;
      thesis += `${s.detailedAnalysis}\n\n`;
      if (s.tradePlan) {
        thesis += `**Execution Plan:**\n- **Entry Zone:** NPR ${s.tradePlan.entryMin} - ${s.tradePlan.entryMax}\n- **Stop Loss:** NPR ${s.tradePlan.stopLoss} (${s.tradePlan.riskPct}% risk)\n- **Target 1:** NPR ${s.tradePlan.target1} (+${s.tradePlan.target1UpsidePct}%)\n- **Target 2:** NPR ${s.tradePlan.target2} (+${s.tradePlan.target2UpsidePct}%)\n- **Risk/Reward:** ${s.tradePlan.riskReward}\n\n`;
      }
      if (s.catalysts.length > 0) {
        thesis += `**Active Catalysts:**\n` + s.catalysts.map((c) => `- ${c.headline}`).join("\n");
      }
      if (isStarred) {
        thesis += `\n\n⭐ *This stock is in your personal Watchlist.*`;
      }
      return { answer: thesis, recommendedStocks: [s] };
    }
  }

  // 2. Personal watchlist query
  if (q.includes("my watchlist") || q.includes("my stocks") || q.includes("starred")) {
    if (userWatchlistSymbols.length === 0) {
      return {
        answer: "Your personal watchlist is currently empty. Click the ⭐ star button on any stock card below to track it, and I will monitor its buy/sell signals for you in real-time!",
        recommendedStocks: scanResult.topBuys.slice(0, 3),
      };
    }
    const watched = all.filter((s) => userWatchlistSymbols.includes(s.symbol));
    const buys = watched.filter((s) => s.action === "BUY");
    const sells = watched.filter((s) => s.action === "SELL");

    let text = `### Your Watchlist Review (${watched.length} Stocks)\n\n`;
    if (buys.length > 0) {
      text += `🟢 **Active Buy Opportunities:** ${buys.map((b) => `**${b.symbol}** (${b.headlineReason})`).join("; ")}\n\n`;
    }
    if (sells.length > 0) {
      text += `🔴 **Caution / Take Profit:** ${sells.map((s) => `**${s.symbol}** (${s.headlineReason})`).join("; ")}\n\n`;
    }
    text += `The rest of your watchlist is holding in healthy consolidation zones. See full cards below:`;
    return { answer: text, recommendedStocks: watched };
  }

  // 3. Sector query (e.g., "bank", "hydro", "microfinance", "insurance")
  const sectors = ["commercial banks", "hydropower", "manufacturing", "microfinance", "insurance", "development banks", "investment", "finance"];
  const matchedSector = sectors.find((sec) => q.includes(sec) || (sec === "commercial banks" && q.includes("bank")) || (sec === "hydropower" && q.includes("hydro")));
  if (matchedSector) {
    const secStocks = all.filter((s) => s.sector.toLowerCase().includes(matchedSector.replace("commercial banks", "bank").replace("hydropower", "hydro")));
    const secBuys = secStocks.filter((s) => s.action === "BUY");
    const topSec = secBuys.length > 0 ? secBuys : secStocks.slice(0, 4);

    let text = `### Top Picks in ${topSec[0]?.sector || "Sector"}\n\n`;
    text += `Found **${secStocks.length}** monitored companies in this sector. Here are the highest conviction candidates based on trend and broker flow:`;
    return { answer: text, recommendedStocks: topSec };
  }

  // 4. Broker accumulation query
  if (q.includes("broker") || q.includes("smart money") || q.includes("accumulation")) {
    const highBroker = [...all].sort((a, b) => b.brokerAccumulationPct - a.brokerAccumulationPct).slice(0, 4);
    let text = `### Top Stocks with Highest Institutional Broker Accumulation\n\n`;
    text += `The following stocks have the highest net volume absorption by the top 3 broker desks over the past 15 sessions:\n\n`;
    for (const s of highBroker) {
      text += `- **${s.symbol}** (LTP: NPR ${s.close}): **${s.brokerAccumulationPct.toFixed(1)}%** accumulated by top 3 brokers. *Action: ${s.action}*\n`;
    }
    return { answer: text, recommendedStocks: highBroker };
  }

  // 5. Dividend query
  if (q.includes("dividend") || q.includes("bonus") || q.includes("book closure")) {
    const withDiv = all.filter((s) => s.catalysts.some((c) => c.type === "dividend")).slice(0, 5);
    let text = `### Top High-Dividend Stocks with Upcoming Catalysts\n\n`;
    text += `Here are the top rated companies that have officially declared dividends or scheduled book closure:\n\n`;
    for (const s of withDiv) {
      const divCat = s.catalysts.find((c) => c.type === "dividend");
      text += `- **${s.symbol}** (LTP: NPR ${s.close}): ${divCat?.headline || "Dividend declared"}. *Action: ${s.action}*\n`;
    }
    return { answer: text, recommendedStocks: withDiv };
  }

  // 6. Sell / Overbought query
  if (q.includes("sell") || q.includes("avoid") || q.includes("overbought") || q.includes("take profit")) {
    const sells = scanResult.topSells;
    let text = `### Stocks to Sell, Take Profit, or Avoid Right Now\n\n`;
    text += `These stocks are either deeply overbought or facing structural distribution. We advise tightening stops or locking in profits:\n\n`;
    for (const s of sells) {
      text += `- **${s.symbol}** (LTP: NPR ${s.close}, RSI: ${s.rsi14.toFixed(1)}): ${s.headlineReason}\n`;
    }
    return { answer: text, recommendedStocks: sells };
  }

  // 7. General "what to buy" query
  const topBuys = scanResult.topBuys.slice(0, 4);
  let text = `### Top High-Conviction Trades for Today\n\n`;
  text += `Based on multi-factor quantitative screening (technical trend, RSI divergence, 15-day broker accumulation, and fundamental value), here are our top **${topBuys.length} Buy recommendations**:\n\n`;
  for (const s of topBuys) {
    text += `- **${s.symbol}** (LTP: NPR ${s.close}): ${s.headlineReason} [Target: NPR ${s.tradePlan?.target1 || "N/A"}]\n`;
  }
  text += `\nReview their detailed trade plans and risk-reward below:`;
  return { answer: text, recommendedStocks: topBuys };
}
