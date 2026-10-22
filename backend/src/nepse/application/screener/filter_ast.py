"""Screener filter tree: parse untrusted JSON into a validated AST over a strict field/op whitelist.

    node      := {"and": [node, ...]} | {"or": [node, ...]} | condition
    condition := {"field": <FIELDS key>, "op": <op>, "value": value}
    value     := literal | {"field": <FIELDS key>}         for < <= > >= = !=
               | [lo, hi]                                    for between
               | [literal, ...]                              for in

Only names from FIELDS ever reach SQL, and they reach it as column objects; every literal becomes a bound
parameter in the infrastructure compiler. Anything not described above is rejected with FilterError.
"""
import math
from dataclasses import dataclass
from typing import Literal

NUM, STR = "num", "str"

# Filterable/sortable columns of mv_screener_snapshot. Fundamentals add their columns here at merge time.
FIELDS: dict[str, str] = {
    "symbol": STR,
    "sector": STR,
    "close": NUM,
    "change_pct": NUM,
    "volume": NUM,
    "turnover": NUM,
    "market_cap": NUM,
    "rsi_14": NUM,
    "sma_20": NUM,
    "sma_50": NUM,
    "sma_200": NUM,
    "atr_pct": NUM,
    "high_52w": NUM,
    "low_52w": NUM,
    "top3_broker_accum_15d_pct": NUM,
}
# Every column returned to clients (trade_date is informational, not filterable).
OUTPUT_COLUMNS: tuple[str, ...] = ("symbol", "sector", "trade_date", *[f for f in FIELDS if FIELDS[f] == NUM])

COMPARE_OPS = frozenset({"<", "<=", ">", ">=", "=", "!="})
OPS = COMPARE_OPS | {"between", "in"}
STR_OPS = frozenset({"=", "!=", "in"})

MAX_DEPTH, MAX_NODES, MAX_IN, MAX_STR = 6, 50, 200, 64
MAX_SORT, MAX_LIMIT = 3, 1000

Scalar = float | str


class FilterError(ValueError):
    pass


@dataclass(frozen=True)
class FieldRef:
    name: str


@dataclass(frozen=True)
class Condition:
    field: str
    op: str
    value: Scalar | FieldRef | tuple[Scalar, ...]  # tuple for between (lo, hi) and in


@dataclass(frozen=True)
class Group:
    kind: Literal["and", "or"]
    children: tuple["Node", ...]


Node = Condition | Group


@dataclass(frozen=True)
class SortKey:
    field: str
    desc: bool


def _field(name: object) -> str:
    if not isinstance(name, str) or name not in FIELDS:
        raise FilterError(f"unknown field: {name!r}")
    return name


def _literal(value: object, kind: str) -> Scalar:
    if kind == NUM:
        if isinstance(value, bool) or not isinstance(value, int | float) or not math.isfinite(value):
            raise FilterError(f"expected a finite number, got {value!r}")
        return float(value)
    if not isinstance(value, str) or len(value) > MAX_STR:
        raise FilterError(f"expected a string of at most {MAX_STR} chars, got {value!r}")
    return value


def _condition(raw: dict) -> Condition:
    if set(raw) != {"field", "op", "value"}:
        raise FilterError(f"a condition needs exactly field, op and value, got {sorted(map(str, raw))}")
    field, op, value = _field(raw["field"]), raw["op"], raw["value"]
    if not isinstance(op, str) or op not in OPS:
        raise FilterError(f"unknown op: {op!r}")
    kind = FIELDS[field]
    if kind == STR and op not in STR_OPS:
        raise FilterError(f"op {op!r} is not allowed on text field {field!r}")
    if op == "between":
        if not isinstance(value, list) or len(value) != 2:
            raise FilterError("between needs [lo, hi]")
        return Condition(field, op, (_literal(value[0], kind), _literal(value[1], kind)))
    if op == "in":
        if not isinstance(value, list) or not 0 < len(value) <= MAX_IN:
            raise FilterError(f"in needs a list of 1..{MAX_IN} values")
        return Condition(field, op, tuple(_literal(v, kind) for v in value))
    if isinstance(value, dict):
        if set(value) != {"field"}:
            raise FilterError("a field reference is {\"field\": name}")
        other = _field(value["field"])
        if FIELDS[other] != kind:
            raise FilterError(f"cannot compare {field!r} with {other!r}: different types")
        return Condition(field, op, FieldRef(other))
    return Condition(field, op, _literal(value, kind))


def parse_filter(raw: object) -> Node | None:
    """None/{} means no filter."""
    if raw is None or raw == {}:
        return None
    count = 0

    def walk(node: object, depth: int) -> Node:
        nonlocal count
        count += 1
        if count > MAX_NODES or depth > MAX_DEPTH:
            raise FilterError(f"filter too large (max {MAX_NODES} nodes, depth {MAX_DEPTH})")
        if not isinstance(node, dict):
            raise FilterError("each node must be an object")
        if len(node) == 1 and next(iter(node)) in ("and", "or"):
            kind, children = next(iter(node.items()))
            if not isinstance(children, list) or not children:
                raise FilterError(f"{kind!r} needs a non-empty list")
            return Group(kind, tuple(walk(c, depth + 1) for c in children))
        return _condition(node)

    return walk(raw, 1)


def parse_sort(raw: object) -> list[SortKey]:
    """["-rsi_14", "symbol"]: a leading '-' sorts descending."""
    if raw is None:
        return [SortKey("symbol", False)]
    if isinstance(raw, str):
        raw = [raw]
    if not isinstance(raw, list) or len(raw) > MAX_SORT or not all(isinstance(s, str) for s in raw):
        raise FilterError(f"sort must be a list of at most {MAX_SORT} field names")
    return [SortKey(_field(s.removeprefix("-")), s.startswith("-")) for s in raw]


def parse_limit(raw: object) -> int:
    if isinstance(raw, bool) or not isinstance(raw, int) or not 1 <= raw <= MAX_LIMIT:
        raise FilterError(f"limit must be an integer in 1..{MAX_LIMIT}")
    return raw
