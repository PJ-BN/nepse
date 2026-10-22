"""Cross-fund NAV discount table with the Blueprint flag: >15% below NAV and maturing within 12 months."""
from datetime import date

from nepse.application.mutual_funds.ports import MutualFundRepository
from nepse.domain.fundamentals.valuation import mf_discount_flag, nav_discount_pct


async def list_mutual_funds(repo: MutualFundRepository, today: date) -> list[dict]:
    rows = []
    for f in await repo.snapshots():
        disc = nav_discount_pct(f.ltp, f.nav)
        rows.append({
            "symbol": f.symbol, "name": f.name, "ltp": f.ltp, "nav": f.nav, "nav_date": f.nav_date,
            "nav_discount_pct": disc, "maturity_date": f.maturity_date,
            "days_to_maturity": (f.maturity_date - today).days if f.maturity_date else None,
            "flagged": mf_discount_flag(disc, f.maturity_date, today),
        })
    # flagged first, then deepest discount; funds without a NAV last
    rows.sort(key=lambda r: (not r["flagged"], r["nav_discount_pct"] is None, r["nav_discount_pct"] or 0, r["symbol"]))
    return rows
