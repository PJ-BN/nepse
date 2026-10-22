"""Join the parallel feature-branch migrations into one head.

Revision ID: 0003_merge_feature_heads
Revises: 0002_floorsheet, 0002_fundamentals, 0002_portfolio, 0002_screener_macro
"""
revision = "0003_merge_feature_heads"
down_revision = ("0002_floorsheet", "0002_fundamentals", "0002_portfolio", "0002_screener_macro")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
