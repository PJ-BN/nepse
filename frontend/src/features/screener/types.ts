export type Op = "<" | "<=" | ">" | ">=" | "=" | "!=" | "between" | "in";
export type Scalar = number | string;
export type FieldRef = { field: string };

export type Condition = { field: string; op: Op; value: Scalar | FieldRef | Scalar[] };
export type FilterNode = { and: FilterNode[] } | { or: FilterNode[] } | Condition;

export type ScreenerRequest = {
  filter?: FilterNode | null;
  sort?: string[];
  limit?: number;
  preset?: string;
};

export type ScreenerRow = {
  symbol: string;
  sector: string | null;
  trade_date: string | null;
  [column: string]: string | number | null;
};

export type ScreenerResult = { columns: string[]; count: number; rows: ScreenerRow[] };

export type Preset = { id: string; name: string; description: string; filter: FilterNode; sort: string[] };
