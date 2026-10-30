"""User chart drawings and layouts tables.

Revision ID: 0011_user_chart_data
Revises: 0010_user_watchlists
"""
from alembic import op

revision = "0011_user_chart_data"
down_revision = "0010_user_watchlists"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS user_chart_drawings (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            symbol VARCHAR(20) NOT NULL,
            drawings JSONB NOT NULL DEFAULT '[]',
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_user_chart_drawings UNIQUE (user_id, symbol)
        );
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_user_chart_drawings_user_id ON user_chart_drawings (user_id);
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS user_chart_layouts (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(64) NOT NULL,
            settings JSONB NOT NULL DEFAULT '{}',
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_user_chart_layouts UNIQUE (user_id, name)
        );
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_user_chart_layouts_user_id ON user_chart_layouts (user_id);
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS user_chart_layouts;")
    op.execute("DROP TABLE IF EXISTS user_chart_drawings;")
