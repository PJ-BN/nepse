"""Store the fund maturity date published with each NAV.

Revision ID: 0007_nav_maturity
Revises: 0006_merge_0005_heads

The mutual-funds screen flags deep discounts near maturity, but nothing filled sector_metrics.maturity_date for funds;
ShareSansar publishes it next to the NAV.
"""
from alembic import op

revision = "0007_nav_maturity"
down_revision = "0006_merge_0005_heads"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE mutual_fund_nav ADD COLUMN maturity_date date")


def downgrade() -> None:
    op.execute("ALTER TABLE mutual_fund_nav DROP COLUMN maturity_date")
