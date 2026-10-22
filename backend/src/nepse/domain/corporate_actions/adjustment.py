"""Price adjustment for bonus and right issues.

A right issue is priced at par (NPR 100). For bonus fraction B and right fraction R:
    P_adj = (P_mkt + 100*R) / (1 + B + R),   F_adj = P_adj / P_mkt
where P_mkt is the last close before the book-closure date. Every trading date before a
book-closure date is multiplied by the F_adj of that action and of every later one.
"""
from bisect import bisect_left
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date

PAR = 100.0


@dataclass(frozen=True)
class CorporateAction:
    book_closure_date: date
    bonus: float = 0.0  # fraction, 0.10 = 10% bonus
    right: float = 0.0  # fraction, 0.20 = 20% right


def adjusted_price(p_mkt: float, bonus: float, right: float) -> float:
    return (p_mkt + PAR * right) / (1 + bonus + right)


def adjustment_factor(p_mkt: float, bonus: float, right: float) -> float:
    return adjusted_price(p_mkt, bonus, right) / p_mkt


def action_factors(closes: Sequence[tuple[date, float]], actions: Sequence[CorporateAction]) -> list[float]:
    """F_adj per action, using the last close before its book closure. `closes` must be sorted by date.

    An action with no earlier close (before listed history) gets 1.0: there is nothing to adjust.
    """
    dates = [d for d, _ in closes]
    out = []
    for a in actions:
        i = bisect_left(dates, a.book_closure_date)
        out.append(adjustment_factor(closes[i - 1][1], a.bonus, a.right) if i and closes[i - 1][1] else 1.0)
    return out


def cumulative_factors(trade_dates: Sequence[date], events: Sequence[tuple[date, float]]) -> list[float]:
    """Backward factor per trade date: product of the factors of all events dated after it."""
    out = []
    for d in trade_dates:
        f = 1.0
        for when, factor in events:
            if d < when:
                f *= factor
        out.append(f)
    return out
