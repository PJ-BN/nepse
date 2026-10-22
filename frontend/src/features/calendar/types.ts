export type DividendEvent = {
  symbol: string;
  name: string;
  fy_bs: string;
  bonus_pct: number;
  cash_pct: number;
  right_ratio: string | null;
  book_closure_date: string | null;
  announced_on: string | null;
};

export type Announcement = { title: string; url: string; published_on: string };
