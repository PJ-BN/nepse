export type MutualFund = {
  symbol: string;
  name: string;
  ltp: number | null;
  nav: number | null;
  nav_date: string | null;
  nav_discount_pct: number | null; // negative = trades below NAV
  maturity_date: string | null;
  days_to_maturity: number | null;
  flagged: boolean;
};
