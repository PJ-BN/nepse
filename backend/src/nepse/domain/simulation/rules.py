"""Signal rules: an and/or tree of comparisons between indicators, prices and numbers, evaluated bar by bar.

    node      := {"and": [node, ...]} | {"or": [node, ...]} | condition
    condition := {"left": operand, "op": <OPS>, "right": operand}
    operand   := number | {"ind": <INDICATORS key>, <param>: number, ...}

Every indicator is causal (value at bar i uses bars 0..i only) and `crosses_*` looks at bars i-1 and i, so a signal
at bar i never depends on later bars. Anything outside the grammar or the parameter bounds raises RuleError.
"""
import math
from dataclasses import dataclass
from typing import Literal

from nepse.domain.technicals import indicators as ta
from nepse.domain.technicals.indicators import Series

MAX_DEPTH, MAX_NODES = 6, 50
OPS = ("<", "<=", ">", ">=", "crosses_above", "crosses_below")


class RuleError(ValueError):
    pass


@dataclass(frozen=True)
class Candles:
    open: list[float]
    high: list[float]
    low: list[float]
    close: list[float]
    volume: list[float]

    def __len__(self) -> int:
        return len(self.close)

    def head(self, n: int) -> "Candles":
        return Candles(self.open[:n], self.high[:n], self.low[:n], self.close[:n], self.volume[:n])


def _parts(prefix: str, names: tuple[str, ...], params: dict, fn, pane: str) -> dict:
    """One registry entry per output of a multi-output indicator, e.g. macd.line / macd.signal / macd.hist."""
    return {f"{prefix}.{name}": (params, (lambda i: lambda c, **p: fn(c, **p)[i])(idx), pane)
            for idx, name in enumerate(names)}


_N = (14, 1, 400)  # (default, min, max)
# name -> (parameters, compute(candles, **params) -> Series, pane hint)
INDICATORS: dict[str, tuple[dict[str, tuple[float, float, float]], object, str]] = {
    "open": ({}, lambda c: c.open, "price"),
    "high": ({}, lambda c: c.high, "price"),
    "low": ({}, lambda c: c.low, "price"),
    "close": ({}, lambda c: c.close, "price"),
    "volume": ({}, lambda c: c.volume, "oscillator"),
    "sma": ({"n": (20, 1, 400)}, lambda c, n: ta.sma(c.close, n), "price"),
    "ema": ({"n": (20, 1, 400)}, lambda c, n: ta.ema(c.close, n), "price"),
    "rsi": ({"n": _N}, lambda c, n: ta.rsi(c.close, n), "oscillator"),
    "atr": ({"n": _N}, lambda c, n: ta.atr(c.high, c.low, c.close, n), "oscillator"),
    "roc": ({"n": (12, 1, 400)}, lambda c, n: ta.roc(c.close, n), "oscillator"),
    "highest": ({"n": (20, 1, 400)}, lambda c, n: ta.highest(c.high, n), "price"),
    "lowest": ({"n": (20, 1, 400)}, lambda c, n: ta.lowest(c.low, n), "price"),
    "volume_sma": ({"n": (20, 1, 400)}, lambda c, n: ta.sma(c.volume, n), "oscillator"),
    "obv": ({}, lambda c: ta.obv(c.close, c.volume), "oscillator"),
    **_parts("macd", ("line", "signal", "hist"), {"fast": (12, 1, 400), "slow": (26, 1, 400), "signal": (9, 1, 400)},
             lambda c, fast, slow, signal: ta.macd(c.close, fast, slow, signal), "oscillator"),
    **_parts("bb", ("mid", "upper", "lower"), {"n": (20, 1, 400), "k": (2.0, 0.1, 10.0)},
             lambda c, n, k: ta.bollinger(c.close, n, k), "price"),
    **_parts("stoch", ("k", "d"), {"k": _N, "d": (3, 1, 400)},
             lambda c, k, d: ta.stochastic(c.high, c.low, c.close, k, d), "oscillator"),
    **_parts("adx", ("adx", "plus_di", "minus_di"), {"n": _N},
             lambda c, n: ta.adx(c.high, c.low, c.close, n), "oscillator"),
}


@dataclass(frozen=True)
class Const:
    value: float

    @property
    def label(self) -> str:
        return f"{self.value:g}"


@dataclass(frozen=True)
class Indicator:
    name: str
    params: tuple[tuple[str, float], ...]

    @property
    def label(self) -> str:
        return f"{self.name}({','.join(f'{v:g}' for _, v in self.params)})" if self.params else self.name

    @property
    def pane(self) -> str:
        return INDICATORS[self.name][2]

    def compute(self, c: Candles) -> Series:
        return INDICATORS[self.name][1](c, **dict(self.params))  # type: ignore[operator]


Operand = Const | Indicator


@dataclass(frozen=True)
class Condition:
    left: Operand
    op: str
    right: Operand


@dataclass(frozen=True)
class Group:
    kind: Literal["and", "or"]
    children: tuple["Node", ...]


Node = Condition | Group


def _number(v: object, what: str) -> float:
    if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v):
        raise RuleError(f"{what} must be a finite number")
    return v


def _operand(raw: object) -> Operand:
    if not isinstance(raw, dict):
        return Const(float(_number(raw, "operand")))
    name = raw.get("ind")
    if not isinstance(name, str) or name not in INDICATORS:
        raise RuleError(f"unknown indicator {name!r}; choose from {sorted(INDICATORS)}")
    spec = INDICATORS[name][0]
    if extra := set(raw) - {"ind"} - set(spec):
        raise RuleError(f"{name}: unknown parameter(s) {sorted(extra)}; allowed {list(spec)}")
    params = []
    for key, (default, lo, hi) in spec.items():
        v = _number(raw.get(key, default), f"{name}.{key}")
        if not lo <= v <= hi:
            raise RuleError(f"{name}.{key} must be between {lo:g} and {hi:g}")
        if isinstance(default, int):
            if v != int(v):
                raise RuleError(f"{name}.{key} must be a whole number")
            v = int(v)
        params.append((key, v))
    return Indicator(name, tuple(params))


def parse(raw: object) -> Node:
    count = 0

    def walk(node: object, depth: int) -> Node:
        nonlocal count
        count += 1
        if depth > MAX_DEPTH or count > MAX_NODES:
            raise RuleError(f"rule too large: at most {MAX_NODES} nodes nested {MAX_DEPTH} deep")
        if not isinstance(node, dict):
            raise RuleError("a rule node must be an object")
        if "and" in node or "or" in node:
            if len(node) != 1:
                raise RuleError("a group has exactly one key, 'and' or 'or'")
            kind = "and" if "and" in node else "or"
            kids = node[kind]
            if not isinstance(kids, list) or not kids:
                raise RuleError(f"'{kind}' needs a non-empty list")
            return Group(kind, tuple(walk(k, depth + 1) for k in kids))
        if set(node) != {"left", "op", "right"}:
            raise RuleError("a condition has exactly the keys left, op, right")
        if node["op"] not in OPS:
            raise RuleError(f"unknown operator {node['op']!r}; choose from {list(OPS)}")
        return Condition(_operand(node["left"]), node["op"], _operand(node["right"]))

    return walk(raw, 1)


@dataclass(frozen=True)
class Evaluation:
    fired: list[bool]  # the whole rule, per bar
    conditions: list[tuple[Condition, list[bool]]]  # every leaf in tree order, per bar
    series: dict[Operand, Series]  # each distinct operand, computed once


def _holds(op: str, a: Series, b: Series, i: int) -> bool:
    if a[i] is None or b[i] is None:
        return False
    if op in ("crosses_above", "crosses_below"):
        if i == 0 or a[i - 1] is None or b[i - 1] is None:
            return False
        if op == "crosses_above":
            return a[i - 1] <= b[i - 1] and a[i] > b[i]
        return a[i - 1] >= b[i - 1] and a[i] < b[i]
    return {"<": a[i] < b[i], "<=": a[i] <= b[i], ">": a[i] > b[i], ">=": a[i] >= b[i]}[op]


def evaluate(rule: Node, c: Candles) -> Evaluation:
    series: dict[Operand, Series] = {}
    conditions: list[tuple[Condition, list[bool]]] = []

    def get(o: Operand) -> Series:
        if o not in series:
            series[o] = [o.value] * len(c) if isinstance(o, Const) else o.compute(c)
        return series[o]

    def truth(node: Node) -> list[bool]:
        if isinstance(node, Condition):
            a, b = get(node.left), get(node.right)
            out = [_holds(node.op, a, b, i) for i in range(len(c))]
            conditions.append((node, out))
            return out
        kids = [truth(k) for k in node.children]
        combine = all if node.kind == "and" else any
        return [combine(col) for col in zip(*kids)]

    return Evaluation(truth(rule), conditions, series)
