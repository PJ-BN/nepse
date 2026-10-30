"""User watchlists table.

Revision ID: 0010_user_watchlists
Revises: 0009_ai_evaluations
"""
from alembic import op

revision = "0010_user_watchlists"
down_revision = "0009_ai_evaluations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS user_watchlists (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            symbol VARCHAR(20) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_user_watchlists_user_symbol UNIQUE (user_id, symbol)
        );
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_user_watchlists_user_id ON user_watchlists (user_id);
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS user_watchlists;")
