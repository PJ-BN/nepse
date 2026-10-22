"""Compress old ohlcv_daily chunks.

Revision ID: 0005_charting
Revises: 0004_screener_fundamentals

Chunks are one year wide and the adjustment engine rewrites adj_factor over the whole history, so only chunks
older than three years are compressed; TimescaleDB (2.11+) decompresses them transparently on UPDATE. No
intraday continuous aggregate: bars are built from floorsheet_ticks at query time (see SqlChartRepository), so
there is nothing to keep refreshed after a late backfill.
"""
from alembic import op

revision = "0005_charting"
down_revision = "0004_screener_fundamentals"
branch_labels = None
depends_on = None

UPGRADE = """
ALTER TABLE ohlcv_daily SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'company_id',
    timescaledb.compress_orderby = 'trade_date DESC'
);
SELECT add_compression_policy('ohlcv_daily', INTERVAL '3 years');
"""

DOWNGRADE = """
SELECT remove_compression_policy('ohlcv_daily', if_exists => true);
SELECT decompress_chunk(c, if_compressed => true) FROM show_chunks('ohlcv_daily') c;
ALTER TABLE ohlcv_daily SET (timescaledb.compress = false);
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
