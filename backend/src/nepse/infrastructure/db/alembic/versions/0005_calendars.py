"""Announcements feed (ShareSansar, hourly).

Revision ID: 0005_calendars
Revises: 0004_screener_fundamentals
"""
from alembic import op

revision = "0005_calendars"
down_revision = "0004_screener_fundamentals"  # the id of migration 0004
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE announcements (
            id           SERIAL PRIMARY KEY,
            url          TEXT NOT NULL UNIQUE,
            title        TEXT NOT NULL,
            published_on DATE NOT NULL,
            fetched_at   TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("""
        CREATE INDEX announcements_published_idx ON announcements (published_on DESC, id DESC);
    """)


def downgrade() -> None:
    op.execute("DROP TABLE announcements")
