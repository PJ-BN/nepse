"""Replay a rule at a past date and show what followed, plus how the same rule fared before that date.

Look-ahead rule: everything about the anchor and the stats may only depend on bars up to the anchor bar. Earlier
events are therefore scored on bars truncated at the anchor (a horizon that would reach past it is left out), while
the anchor's own forward path is the "future" the caller reveals afterwards.
"""
from dataclasses import dataclass
from datetime import date, timedelta
from statistics import median

from nepse.application.simulation.ports import BarSource
from nepse.domain.simulation.forward import Bracket, Forward, forward
from nepse.domain.simulation.rules import Candles, Indicator, RuleError, evaluate, parse

MIN_HISTORY, MIN_EVENTS = 250, 10


class SimulationError(ValueError):
    """Valid request, but nothing to simulate (no bars on or before the anchor)."""


class UnknownSymbol(LookupError):
    pass


@dataclass(frozen=True)
class SimulationRequest:
    symbol: str
    anchor_date: date
    rules: object
    horizons: list[int]
    target_pct: float | None = None
    stop_pct: float | None = None
    cost_pct: float = 0.0
    events_from: date | None = None


def _round(v: float | None) -> float | None:
    return None if v is None else round(v, 4)


def _bracket(b: Bracket | None) -> dict | None:
    return None if b is None else {"outcome": b.outcome, "bars": b.bars, "ret": _round(b.ret)}


def _results(f: Forward) -> list[dict]:
    return [{"horizon": r.horizon, "ret": _round(r.ret), "mfe": _round(r.mfe), "mae": _round(r.mae)} for r in f.results]


def _stats(horizons: list[int], events: list[dict]) -> list[dict]:
    out = []
    for h in sorted(set(horizons)):
        rets = [r["ret"] for e in events for r in e["results"] if r["horizon"] == h]
        out.append({
            "horizon": h, "count": len(rets),
            "win_rate": round(sum(r > 0 for r in rets) / len(rets), 4) if rets else None,
            "avg_return": round(sum(rets) / len(rets), 4) if rets else None,
            "median_return": round(median(rets), 4) if rets else None,
        })
    return out


async def run_simulation(repo: BarSource, req: SimulationRequest) -> dict:
    rule = parse(req.rules)  # RuleError before any database work
    if not req.horizons or min(req.horizons) < 1:
        raise SimulationError("horizons must be positive bar counts")
    if await repo.find_symbol(req.symbol) is None:
        raise UnknownSymbol(req.symbol)
    bars = await repo.bars(req.symbol, date(1990, 1, 1), date(2100, 1, 1))
    idx = max((i for i, b in enumerate(bars) if b.trade_date <= req.anchor_date), default=None)
    if idx is None:
        raise SimulationError(f"{req.symbol} has no bars on or before {req.anchor_date}")

    # Adjusted but unrounded; volume moves the opposite way so turnover stays comparable.
    candles = Candles(
        [b.open * b.adj_factor for b in bars], [b.high * b.adj_factor for b in bars],
        [b.low * b.adj_factor for b in bars], [b.close * b.adj_factor for b in bars],
        [b.volume / b.adj_factor for b in bars])
    dates = [b.trade_date for b in bars]
    ev = evaluate(rule, candles)
    horizons = sorted(set(req.horizons))
    anchor_date = dates[idx]

    past = candles.head(idx + 1)  # all that is knowable at the anchor
    start = req.events_from or anchor_date - timedelta(days=5 * 365)
    events = []
    for i in range(idx):
        if not ev.fired[i] or dates[i] < start:
            continue
        f = forward(past, i, horizons, req.target_pct, req.stop_pct, req.cost_pct)
        if f is not None:
            events.append({"date": dates[i].isoformat(), "entry_date": dates[f.entry].isoformat(),
                           "entry_price": _round(f.entry_price), "results": _results(f),
                           "bracket": _bracket(f.bracket)})

    labels = {k: k.label for k in ev.series}
    snapshot = []
    for cond, truth in ev.conditions:
        a, b = ev.series[cond.left][idx], ev.series[cond.right][idx]
        snapshot.append({"left": labels[cond.left], "op": cond.op, "right": labels[cond.right],
                         "left_value": _round(a), "right_value": _round(b), "met": truth[idx]})
    anchor = {"date": anchor_date.isoformat(), "requested_date": req.anchor_date.isoformat(),
              "fired": ev.fired[idx], "conditions": snapshot,
              "values": {labels[k]: _round(s[idx]) for k, s in ev.series.items() if isinstance(k, Indicator)}}

    fwd = forward(candles, idx, horizons, req.target_pct, req.stop_pct, req.cost_pct)
    fwd_out = None if fwd is None else {
        "entry_date": dates[fwd.entry].isoformat(), "entry_price": _round(fwd.entry_price),
        "path": [{"t": dates[fwd.entry + k].isoformat(), "ret": _round(r)} for k, r in enumerate(fwd.path, start=1)],
        "results": _results(fwd), "bracket": _bracket(fwd.bracket)}

    warnings = []
    if anchor_date != req.anchor_date:
        warnings.append(f"No bar on {req.anchor_date}; used the previous trading day {anchor_date}.")
    if idx + 1 < MIN_HISTORY:
        warnings.append(f"Only {idx + 1} bars of history up to the anchor; long-period indicators may be undefined.")
    if not ev.fired[idx]:
        warnings.append("The rule did not fire at the anchor bar.")
    if len(events) < MIN_EVENTS:
        warnings.append(f"Only {len(events)} earlier firings in the window: the statistics are anecdotes, not evidence.")
    if fwd is None:
        warnings.append("The anchor is the last bar: there is no forward data yet.")
    elif len(fwd.results) < len(horizons):
        warnings.append("Some horizons extend past the latest bar and have no result.")

    return {
        "symbol": req.symbol,
        "bars": [{"t": d.isoformat(), "o": _round(o), "h": _round(h), "l": _round(lo), "c": _round(c),
                  "v": round(v)} for d, o, h, lo, c, v in zip(
                      dates, candles.open, candles.high, candles.low, candles.close, candles.volume)],
        "indicators": [{"name": k.label, "pane": k.pane, "values": [_round(v) for v in s]}
                       for k, s in ev.series.items()
                       if isinstance(k, Indicator) and k.name not in ("open", "high", "low", "close", "volume")],
        "anchor": anchor, "forward": fwd_out, "events": events,
        "stats": {"events": len(events), "horizons": _stats(horizons, events)},
        "warnings": warnings,
    }


__all__ = ["RuleError", "SimulationError", "SimulationRequest", "UnknownSymbol", "run_simulation"]
