from datetime import date

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from nepse.application.mutual_funds.ports import FundSnapshot

# maturity: the date published with the NAV, else the latest quarterly_financials.sector_metrics (MutualFundMetrics)
_SQL = sa.text("""
SELECT co.symbol, co.name, px.close::float8 AS ltp,
       coalesce(n.weekly_nav, n.monthly_nav)::float8 AS nav, n.nav_date,
       coalesce(n.maturity_date::text, CASE WHEN jsonb_typeof(q.sector_metrics->'maturity_date') = 'string'
            THEN q.sector_metrics->>'maturity_date' END) AS maturity
FROM companies co
LEFT JOIN LATERAL (SELECT close FROM ohlcv_daily WHERE company_id = co.id AND close IS NOT NULL
                   ORDER BY trade_date DESC LIMIT 1) px ON true
LEFT JOIN LATERAL (SELECT weekly_nav, monthly_nav, nav_date, maturity_date FROM mutual_fund_nav
                   WHERE company_id = co.id AND coalesce(weekly_nav, monthly_nav) IS NOT NULL
                   ORDER BY nav_date DESC LIMIT 1) n ON true
LEFT JOIN LATERAL (SELECT sector_metrics FROM quarterly_financials
                   WHERE company_id = co.id AND sector_metrics ? 'maturity_date'
                   ORDER BY period_end DESC LIMIT 1) q ON true
WHERE co.status = 'ACTIVE' AND co.instrument_type = 'MUTUAL_FUND'
ORDER BY co.symbol
""")


def _date(s: str | None) -> date | None:
    try:
        return date.fromisoformat(s) if s else None
    except ValueError:
        return None


class SqlMutualFundRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def snapshots(self) -> list[FundSnapshot]:
        res = await self.session.execute(_SQL)
        return [FundSnapshot(r.symbol, r.name, r.ltp, r.nav, r.nav_date, _date(r.maturity)) for r in res]
