"""Macro indicators, SEBON issue pipeline and the screener snapshot materialized view.

Revision ID: 0002_screener_macro
Revises: 0001
"""
from alembic import op

revision = "0002_screener_macro"
down_revision = "0001"
branch_labels = None
depends_on = None

# mv_screener_snapshot: one row per active company, refreshed with REFRESH MATERIALIZED VIEW CONCURRENTLY.
# Indicators are SQL window functions over split/bonus-adjusted prices (price * adj_factor):
#   rsi_14 / atr_pct use plain 14-bar means (Cutler RSI, SMA ATR); Wilder's recursive smoothing cannot be
#   expressed as a window frame. domain.technicals.indicators(wilder=False) computes the same numbers.
#   top3_broker_accum_15d_pct = net qty bought by the 3 biggest net-buying brokers over the last 15 sessions
#   as % of all qty bought in that window.
# To add columns (e.g. fundamentals at merge time): extend the final SELECT here in a new migration
# (DROP + CREATE the view and its unique index) and add the field to application/screener/filter_ast.FIELDS.
SCREENER_VIEW = """
CREATE MATERIALIZED VIEW mv_screener_snapshot AS
WITH bounds AS (
    SELECT max(trade_date) AS last_day FROM ohlcv_daily
), bars AS (
    -- 400 calendar days covers SMA200 (~230 NEPSE sessions a year) and the 52-week range
    SELECT o.company_id, o.trade_date, o.close, o.prev_close, o.volume, o.turnover,
           (o.close * o.adj_factor)::float8 AS c,
           (coalesce(o.high, o.close) * o.adj_factor)::float8 AS h,
           (coalesce(o.low, o.close) * o.adj_factor)::float8 AS l
    FROM ohlcv_daily o, bounds
    WHERE o.trade_date > bounds.last_day - 400 AND o.close IS NOT NULL
), steps AS (
    SELECT *, c - lag(c) OVER w AS chg,
           greatest(h - l, abs(h - lag(c) OVER w), abs(l - lag(c) OVER w)) AS tr
    FROM bars
    WINDOW w AS (PARTITION BY company_id ORDER BY trade_date)
), ind AS (
    SELECT company_id, trade_date, close, prev_close, volume, turnover, c,
           row_number() OVER (PARTITION BY company_id ORDER BY trade_date DESC) AS rn,
           CASE WHEN count(chg) OVER w14 = 14 THEN avg(greatest(chg, 0)) OVER w14 END AS gain14,
           CASE WHEN count(chg) OVER w14 = 14 THEN avg(greatest(-chg, 0)) OVER w14 END AS loss14,
           CASE WHEN count(*) OVER w14 = 14 THEN avg(tr) OVER w14 END AS atr14,
           CASE WHEN count(*) OVER w20 = 20 THEN avg(c) OVER w20 END AS sma_20,
           CASE WHEN count(*) OVER w50 = 50 THEN avg(c) OVER w50 END AS sma_50,
           CASE WHEN count(*) OVER w200 = 200 THEN avg(c) OVER w200 END AS sma_200,
           max(h) OVER y AS high_52w,
           min(l) OVER y AS low_52w
    FROM steps
    WINDOW w14 AS (PARTITION BY company_id ORDER BY trade_date ROWS 13 PRECEDING),
           w20 AS (PARTITION BY company_id ORDER BY trade_date ROWS 19 PRECEDING),
           w50 AS (PARTITION BY company_id ORDER BY trade_date ROWS 49 PRECEDING),
           w200 AS (PARTITION BY company_id ORDER BY trade_date ROWS 199 PRECEDING),
           y AS (PARTITION BY company_id ORDER BY trade_date RANGE BETWEEN INTERVAL '1 year' PRECEDING AND CURRENT ROW)
), latest AS (
    SELECT * FROM ind WHERE rn = 1
), window_start AS (
    SELECT min(trade_date) AS since FROM (
        SELECT DISTINCT trade_date FROM ohlcv_daily, bounds
        WHERE trade_date > bounds.last_day - 60
        ORDER BY trade_date DESC LIMIT 15
    ) d
), net AS (
    SELECT b.company_id, b.broker, sum(b.buy_qty - b.sell_qty) AS net_qty, sum(b.buy_qty) AS bought
    FROM broker_daily b, window_start w
    WHERE b.day >= w.since::timestamp AT TIME ZONE 'Asia/Kathmandu'
    GROUP BY 1, 2
), accum AS (
    SELECT company_id,
           (100.0 * coalesce(sum(net_qty) FILTER (WHERE rk <= 3 AND net_qty > 0), 0)
                  / nullif(sum(bought), 0))::float8 AS pct
    FROM (SELECT *, row_number() OVER (PARTITION BY company_id ORDER BY net_qty DESC) AS rk FROM net) r
    GROUP BY company_id
)
SELECT co.symbol,
       s.code AS sector,
       l.trade_date,
       l.close::float8 AS close,
       CASE WHEN l.prev_close > 0 THEN (100 * (l.close - l.prev_close) / l.prev_close)::float8 END AS change_pct,
       l.volume,
       l.turnover::float8 AS turnover,
       (l.close * co.listed_shares)::float8 AS market_cap,
       CASE WHEN l.loss14 = 0 THEN 100.0 ELSE 100 - 100 / (1 + l.gain14 / l.loss14) END AS rsi_14,
       l.sma_20,
       l.sma_50,
       l.sma_200,
       CASE WHEN l.c > 0 THEN 100 * l.atr14 / l.c END AS atr_pct,
       l.high_52w,
       l.low_52w,
       a.pct AS top3_broker_accum_15d_pct
FROM companies co
LEFT JOIN sectors s ON s.id = co.sector_id
LEFT JOIN latest l ON l.company_id = co.id
LEFT JOIN accum a ON a.company_id = co.id
WHERE co.status = 'ACTIVE' AND co.instrument_type <> 'DEBENTURE'
WITH DATA;

CREATE UNIQUE INDEX mv_screener_snapshot_symbol ON mv_screener_snapshot (symbol);
"""

UPGRADE = """
CREATE TABLE macro_indicators (
    obs_date   DATE NOT NULL,
    indicator  TEXT NOT NULL,
    value      DOUBLE PRECISION NOT NULL,
    source     TEXT NOT NULL,
    PRIMARY KEY (indicator, obs_date)
);
SELECT create_hypertable('macro_indicators', by_range('obs_date', INTERVAL '10 years'));

-- SEBON issue lists (IPO / right share, application pipeline or approved). Dates stay in Bikram Sambat as published.
CREATE TABLE ipo_pipeline (
    id                   SERIAL PRIMARY KEY,
    company              TEXT NOT NULL,
    issue_type           TEXT NOT NULL,
    stage                TEXT NOT NULL CHECK (stage IN ('PIPELINE', 'APPROVED')),
    sector               TEXT,
    units                DOUBLE PRECISION,
    amount               DOUBLE PRECISION,
    issue_manager        TEXT,
    application_date_bs  TEXT,
    approval_date_bs     TEXT,
    as_of_bs             TEXT,
    source_url           TEXT,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company, issue_type, stage)
);
""" + SCREENER_VIEW

DOWNGRADE = """
DROP MATERIALIZED VIEW IF EXISTS mv_screener_snapshot;
DROP TABLE IF EXISTS ipo_pipeline;
DROP TABLE IF EXISTS macro_indicators;  -- a hypertable must be dropped on its own
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
