"""Create news_articles table for financial news, regulatory circulars, and AI impact analysis.

Revision ID: 0008_news
Revises: 0007_nav_maturity
"""
from alembic import op

revision = "0008_news"
down_revision = "0007_nav_maturity"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE news_articles (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            summary TEXT NOT NULL,
            content TEXT NOT NULL DEFAULT '',
            source VARCHAR(64) NOT NULL,
            source_url TEXT NOT NULL UNIQUE,
            category VARCHAR(32) NOT NULL,
            published_on DATE NOT NULL,
            symbols JSONB NOT NULL DEFAULT '[]'::jsonb,
            sector VARCHAR(64),
            impact_stance VARCHAR(32) NOT NULL DEFAULT 'NEUTRAL',
            impact_score INTEGER NOT NULL DEFAULT 0,
            action_recommendation VARCHAR(64) NOT NULL DEFAULT 'HOLD & MONITOR',
            action_detail TEXT NOT NULL DEFAULT '',
            sentiment_label VARCHAR(32) NOT NULL DEFAULT 'NEUTRAL',
            time_horizon VARCHAR(32) NOT NULL DEFAULT 'SHORT_TERM',
            confidence INTEGER NOT NULL DEFAULT 80,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    op.execute("""
        CREATE INDEX news_articles_published_idx ON news_articles (published_on DESC, id DESC);
    """)
    op.execute("""
        CREATE INDEX news_articles_category_idx ON news_articles (category);
    """)
    op.execute("""
        CREATE INDEX news_articles_impact_idx ON news_articles (impact_stance);
    """)


def downgrade() -> None:
    op.execute("DROP TABLE news_articles")
