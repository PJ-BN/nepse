import { FIELDS, type FieldName } from "./fields";
import type { Condition, FilterNode, Op, Scalar } from "./types";

// A pill is one editable condition; the builder combines all pills with a single AND/OR.
export type Pill = {
  id: number;
  field: FieldName;
  op: Op;
  value: string; // number/text; comma-separated for "in"; low bound for "between"
  value2: string; // high bound for "between"
  compareTo: FieldName | null; // compare against another column instead of a literal
};
export type Combinator = "and" | "or";

let nextId = 1;
export const newPill = (over: Partial<Pill> = {}): Pill => ({
  id: nextId++,
  field: "close",
  op: ">",
  value: "",
  value2: "",
  compareTo: null,
  ...over,
});

const literal = (field: FieldName, raw: string): Scalar | null => {
  const s = raw.trim();
  if (s === "") return null;
  if (FIELDS[field].kind === "str") return s;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export function pillToCondition(p: Pill): Condition | null {
  if (p.compareTo && p.op !== "between" && p.op !== "in") return { field: p.field, op: p.op, value: { field: p.compareTo } };
  if (p.op === "between") {
    const lo = literal(p.field, p.value);
    const hi = literal(p.field, p.value2);
    return lo === null || hi === null ? null : { field: p.field, op: p.op, value: [lo, hi] };
  }
  if (p.op === "in") {
    const parts = p.value.split(",").map((v) => literal(p.field, v));
    return parts.length === 0 || parts.some((v) => v === null)
      ? null
      : { field: p.field, op: p.op, value: parts as Scalar[] };
  }
  const v = literal(p.field, p.value);
  return v === null ? null : { field: p.field, op: p.op, value: v };
}

/** Incomplete pills are left out, so a half-typed pill never breaks the query. */
export function pillsToFilter(pills: Pill[], combinator: Combinator): FilterNode | null {
  const conds = pills.map(pillToCondition).filter((c): c is Condition => c !== null);
  if (conds.length === 0) return null;
  return combinator === "and" ? { and: conds } : { or: conds };
}

/** Flat presets ({and|or: [conditions]}) become pills; nested trees are not editable as pills. */
export function filterToPills(node: FilterNode): { pills: Pill[]; combinator: Combinator } | null {
  const combinator: Combinator = "and" in node ? "and" : "or" in node ? "or" : "and";
  const children = "and" in node ? node.and : "or" in node ? node.or : [node];
  const pills: Pill[] = [];
  for (const c of children) {
    if (!("field" in c) || !(c.field in FIELDS)) return null;
    const field = c.field as FieldName;
    const v = c.value;
    if (Array.isArray(v)) {
      pills.push(c.op === "between"
        ? newPill({ field, op: c.op, value: String(v[0]), value2: String(v[1]) })
        : newPill({ field, op: c.op, value: v.join(",") }));
    } else if (typeof v === "object") {
      pills.push(newPill({ field, op: c.op, compareTo: v.field as FieldName }));
    } else {
      pills.push(newPill({ field, op: c.op, value: String(v) }));
    }
  }
  return { pills, combinator };
}
