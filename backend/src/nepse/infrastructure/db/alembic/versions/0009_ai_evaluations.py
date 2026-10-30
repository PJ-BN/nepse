"""Create ai_evaluations and ai_evaluations_history tables for persisting AI generated research, market analyses, stock valuations, and trade scans.

Revision ID: 0009_ai_evaluations
Revises: 0008_news
"""
from alembic import op

revision = "0009_ai_evaluations"
down_revision = "0008_news"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE ai_evaluations (
            id SERIAL PRIMARY KEY,
            feature VARCHAR(32) NOT NULL,
            entity_key VARCHAR(64) NOT NULL,
            payload JSONB NOT NULL,
            source VARCHAR(32) NOT NULL DEFAULT 'agy',
            generated_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_ai_evaluations_feature_key UNIQUE (feature, entity_key)
        );
    """)
    op.execute("""
        CREATE INDEX idx_ai_evaluations_feature_key ON ai_evaluations (feature, entity_key);
    """)
    op.execute("""
        CREATE INDEX idx_ai_evaluations_generated_at ON ai_evaluations (generated_at DESC);
    """)

    op.execute("""
        CREATE TABLE ai_evaluations_history (
            id BIGSERIAL PRIMARY KEY,
            feature VARCHAR(32) NOT NULL,
            entity_key VARCHAR(64) NOT NULL,
            payload JSONB NOT NULL,
            source VARCHAR(32) NOT NULL DEFAULT 'agy',
            generated_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    op.execute("""
        CREATE INDEX idx_ai_eval_hist_feature_key_gen ON ai_evaluations_history (feature, entity_key, generated_at DESC);
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS ai_evaluations_history;")
    op.execute("DROP TABLE IF EXISTS ai_evaluations;")
