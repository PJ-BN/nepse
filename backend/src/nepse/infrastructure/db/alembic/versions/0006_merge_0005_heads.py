"""Join the parallel 0005 migrations into one head.

Revision ID: 0006_merge_0005_heads
Revises: 0005_calendars, 0005_charting, 0005_screener
"""
revision = "0006_merge_0005_heads"
down_revision = ("0005_calendars", "0005_charting", "0005_screener")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
