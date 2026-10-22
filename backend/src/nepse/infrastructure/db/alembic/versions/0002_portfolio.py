"""Users and portfolio transactions.

Revision ID: 0002_portfolio
Revises: 0001
"""
from alembic import op

revision = "0002_portfolio"
down_revision = "0001"
branch_labels = None
depends_on = None

UPGRADE = """
CREATE TABLE users (
    id             SERIAL PRIMARY KEY,
    email          TEXT NOT NULL UNIQUE,  -- stored lower-cased by the application
    password_hash  TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE portfolio_txn_type AS ENUM ('BUY', 'SELL', 'BONUS', 'RIGHT', 'IPO');

CREATE TABLE portfolio_txns (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id  INT NOT NULL REFERENCES companies(id),
    txn_type    portfolio_txn_type NOT NULL,
    qty         INT NOT NULL CHECK (qty > 0),
    rate        NUMERIC(12, 2) NOT NULL CHECK (rate >= 0),
    txn_date    DATE NOT NULL,
    fees        JSONB NOT NULL DEFAULT '{}'  -- fee/tax breakdown computed when the txn was recorded
);
CREATE INDEX portfolio_txns_user_idx ON portfolio_txns (user_id, company_id, txn_date, id);
"""

DOWNGRADE = """
DROP TABLE IF EXISTS portfolio_txns, users;
DROP TYPE IF EXISTS portfolio_txn_type;
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
