"""Rewrite ohlcv_daily.adj_factor for one company from its corporate actions."""
from nepse.application.charting.ports import AdjustmentRepository
from nepse.domain.corporate_actions.adjustment import action_factors, cumulative_factors


async def recompute_adjustments(repo: AdjustmentRepository, company_id: int) -> int:
    """Returns the number of daily rows written. Call after corporate actions or history change."""
    closes = await repo.closes(company_id)
    rows = await repo.actions(company_id)
    actions = [a for _, a in rows]
    factors = action_factors(closes, actions)
    events = [(a.book_closure_date, f) for a, f in zip(actions, factors, strict=True)]
    dates = [d for d, _ in closes]
    daily = list(zip(dates, cumulative_factors(dates, events), strict=True))
    await repo.save_factors(company_id, daily, [(i, f) for (i, _), f in zip(rows, factors, strict=True)])
    return len(daily)
