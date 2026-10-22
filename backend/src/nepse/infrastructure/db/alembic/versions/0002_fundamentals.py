"""Quarterly financials, dividends and mutual-fund NAVs.

Revision ID: 0002_fundamentals
Revises: 0001
"""
from alembic import op

revision = "0002_fundamentals"
down_revision = "0001"
branch_labels = None
depends_on = None

UPGRADE = """
CREATE TABLE quarterly_financials (
    company_id            INT NOT NULL REFERENCES companies(id),
    fy_bs                 TEXT NOT NULL,  -- '2081/82'
    quarter               SMALLINT NOT NULL CHECK (quarter BETWEEN 1 AND 4),
    period_end            DATE NOT NULL,
    paid_up_capital       NUMERIC(20, 2),
    reserves              NUMERIC(20, 2),
    net_profit            NUMERIC(20, 2),
    eps                   NUMERIC(12, 2),
    bvps                  NUMERIC(12, 2),
    total_assets          NUMERIC(20, 2),
    total_debt            NUMERIC(20, 2),
    cash                  NUMERIC(20, 2),
    distributable_profit  NUMERIC(20, 2),
    sector_metrics        JSONB,  -- validated by domain/fundamentals/sector_metrics.py
    PRIMARY KEY (company_id, fy_bs, quarter)
);

CREATE TABLE dividends (
    id                 SERIAL PRIMARY KEY,
    company_id         INT NOT NULL REFERENCES companies(id),
    fy_bs              TEXT NOT NULL,
    bonus_pct          NUMERIC(8, 4) NOT NULL DEFAULT 0,
    cash_pct           NUMERIC(8, 4) NOT NULL DEFAULT 0,
    right_ratio        TEXT,
    book_closure_date  DATE,
    announced_on       DATE,
    UNIQUE NULLS NOT DISTINCT (company_id, fy_bs, book_closure_date)
);

CREATE TABLE mutual_fund_nav (
    company_id   INT NOT NULL REFERENCES companies(id),
    nav_date     DATE NOT NULL,
    weekly_nav   NUMERIC(12, 4),
    monthly_nav  NUMERIC(12, 4),
    PRIMARY KEY (company_id, nav_date)
);
"""

DOWNGRADE = """
DROP TABLE IF EXISTS mutual_fund_nav, dividends, quarterly_financials;
"""


def _statements(sql: str) -> list[str]:
    # asyncpg runs one statement per call; every statement above ends with ";\n".
    return [s for s in sql.split(";\n") if s.strip()]


def upgrade() -> None:
    for stmt in _statements(UPGRADE):
        op.execute(stmt)


def downgrade() -> None:
    for stmt in _statements(DOWNGRADE):
        op.execute(stmt)
