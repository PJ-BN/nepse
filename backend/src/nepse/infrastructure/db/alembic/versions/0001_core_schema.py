"""Core relational tables, TimescaleDB hypertables and broker continuous aggregates.

Revision ID: 0001
Revises:
"""
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

# Frozen copy of the sector list at the time of this migration (do not import live constants here).
SECTORS = [
    ("BANKING", "Commercial Banks"), ("DEVBANK", "Development Banks"), ("FINANCE", "Finance"),
    ("MICROFIN", "Microfinance"), ("LIFEINSU", "Life Insurance"), ("NONLIFE", "Non-Life Insurance"),
    ("HYDRO", "Hydropower"), ("MANUFAC", "Manufacturing & Processing"), ("HOTEL", "Hotels & Tourism"),
    ("TRADING", "Trading"), ("INVEST", "Investment"), ("OTHERS", "Others"), ("MUTUAL", "Mutual Fund"),
]

UPGRADE = """
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE sectors (
    id          SMALLSERIAL PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    index_code  TEXT NOT NULL
);

CREATE TYPE instrument_type AS ENUM ('EQUITY', 'PROMOTER', 'MUTUAL_FUND', 'DEBENTURE');

CREATE TABLE companies (
    id                      SERIAL PRIMARY KEY,
    symbol                  VARCHAR(20) NOT NULL UNIQUE,
    nepse_id                INT UNIQUE,
    name                    TEXT NOT NULL,
    sector_id               SMALLINT REFERENCES sectors(id),
    instrument_type         instrument_type NOT NULL DEFAULT 'EQUITY',
    listed_shares           BIGINT,
    public_shares           BIGINT,
    promoter_shares         BIGINT,
    paid_up_capital         NUMERIC(20, 2),
    listing_date            DATE,
    promoter_lockin_expiry  DATE,
    status                  TEXT NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE brokers (
    id    SMALLINT PRIMARY KEY,  -- broker number as published by NEPSE
    name  TEXT NOT NULL
);

CREATE TABLE corporate_actions (
    id                 SERIAL PRIMARY KEY,
    company_id         INT NOT NULL REFERENCES companies(id),
    fiscal_year_bs     TEXT,
    bonus_pct          NUMERIC(8, 4) NOT NULL DEFAULT 0,
    right_pct          NUMERIC(8, 4) NOT NULL DEFAULT 0,
    cash_pct           NUMERIC(8, 4) NOT NULL DEFAULT 0,
    book_closure_date  DATE NOT NULL,
    adj_factor         NUMERIC(14, 10),
    UNIQUE (company_id, book_closure_date)
);

CREATE TABLE ohlcv_daily (
    trade_date    DATE NOT NULL,
    company_id    INT NOT NULL REFERENCES companies(id),
    open          NUMERIC(12, 2),
    high          NUMERIC(12, 2),
    low           NUMERIC(12, 2),
    close         NUMERIC(12, 2),
    prev_close    NUMERIC(12, 2),
    volume        BIGINT,
    turnover      NUMERIC(20, 2),
    transactions  INT,
    adj_factor    NUMERIC(14, 10) NOT NULL DEFAULT 1.0,  -- cumulative, maintained by the adjustment engine
    PRIMARY KEY (company_id, trade_date)
);
SELECT create_hypertable('ohlcv_daily', by_range('trade_date', INTERVAL '1 year'));

CREATE TABLE index_daily (
    trade_date  DATE NOT NULL,
    index_code  TEXT NOT NULL,
    open        NUMERIC(12, 2),
    high        NUMERIC(12, 2),
    low         NUMERIC(12, 2),
    close       NUMERIC(12, 2),
    turnover    NUMERIC(20, 2),
    PRIMARY KEY (index_code, trade_date)
);
SELECT create_hypertable('index_daily', by_range('trade_date', INTERVAL '1 year'));

-- No FK to brokers: ingestion upserts unseen broker numbers instead of failing a 150k-row COPY.
CREATE TABLE floorsheet_ticks (
    trade_time     TIMESTAMPTZ NOT NULL,
    contract_no    BIGINT NOT NULL,
    company_id     INT NOT NULL REFERENCES companies(id),
    buyer_broker   SMALLINT NOT NULL,
    seller_broker  SMALLINT NOT NULL,
    qty            INT NOT NULL,
    rate           NUMERIC(12, 2) NOT NULL,
    amount         NUMERIC(18, 2) NOT NULL,
    PRIMARY KEY (contract_no, trade_time)  -- hypertable unique keys must include the time column
);
SELECT create_hypertable('floorsheet_ticks', by_range('trade_time', INTERVAL '7 days'));
CREATE INDEX ON floorsheet_ticks (company_id, trade_time DESC);

ALTER TABLE floorsheet_ticks SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'company_id',
    timescaledb.compress_orderby = 'trade_time DESC'
);
SELECT add_compression_policy('floorsheet_ticks', INTERVAL '7 days');

-- Buy and sell sides as two aggregates (continuous aggregates cannot UNION), joined by a plain view.
CREATE MATERIALIZED VIEW broker_buy_daily WITH (timescaledb.continuous) AS
SELECT time_bucket(INTERVAL '1 day', trade_time, 'Asia/Kathmandu') AS day,
       company_id,
       buyer_broker AS broker,
       sum(qty)::BIGINT AS qty,
       sum(amount) AS amt,
       sum(CASE WHEN buyer_broker = seller_broker THEN qty ELSE 0 END)::BIGINT AS self_qty
FROM floorsheet_ticks
GROUP BY 1, 2, 3
WITH NO DATA;

CREATE MATERIALIZED VIEW broker_sell_daily WITH (timescaledb.continuous) AS
SELECT time_bucket(INTERVAL '1 day', trade_time, 'Asia/Kathmandu') AS day,
       company_id,
       seller_broker AS broker,
       sum(qty)::BIGINT AS qty,
       sum(amount) AS amt
FROM floorsheet_ticks
GROUP BY 1, 2, 3
WITH NO DATA;

SELECT add_continuous_aggregate_policy('broker_buy_daily', start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 hour', schedule_interval => INTERVAL '1 hour');
SELECT add_continuous_aggregate_policy('broker_sell_daily', start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 hour', schedule_interval => INTERVAL '1 hour');

CREATE VIEW broker_daily AS
SELECT day, company_id, broker,
       coalesce(b.qty, 0)      AS buy_qty,
       coalesce(s.qty, 0)      AS sell_qty,
       coalesce(b.amt, 0)      AS buy_amt,
       coalesce(s.amt, 0)      AS sell_amt,
       coalesce(b.self_qty, 0) AS self_trade_qty
FROM broker_buy_daily b
FULL JOIN broker_sell_daily s USING (day, company_id, broker);
"""

DOWNGRADE = """
DROP VIEW IF EXISTS broker_daily;
DROP MATERIALIZED VIEW IF EXISTS broker_sell_daily;
DROP MATERIALIZED VIEW IF EXISTS broker_buy_daily;
DROP TABLE IF EXISTS floorsheet_ticks, index_daily, ohlcv_daily, corporate_actions, brokers, companies, sectors;
DROP TYPE IF EXISTS instrument_type;
"""


def _statements(sql: str) -> list[str]:
    # asyncpg runs one statement per call; every statement above ends with ";\n".
    return [s for s in sql.split(";\n") if s.strip()]


def upgrade() -> None:
    # Continuous aggregates cannot be created inside a transaction block.
    with op.get_context().autocommit_block():
        for stmt in _statements(UPGRADE):
            op.execute(stmt)
        values = ", ".join(f"('{code}', '{name}', '{code}')" for code, name in SECTORS)
        op.execute(f"INSERT INTO sectors (code, name, index_code) VALUES {values}")


def downgrade() -> None:
    with op.get_context().autocommit_block():
        for stmt in _statements(DOWNGRADE):
            op.execute(stmt)
