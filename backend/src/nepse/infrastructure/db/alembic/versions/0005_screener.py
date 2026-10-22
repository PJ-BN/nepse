"""Screener snapshot gains rsi_bull_div: 1 when price makes a lower low while RSI(14) makes a higher low.

Revision ID: 0005_screener
Revises: 0004_screener_fundamentals

Frozen copies of both view definitions: upgrade is the 0004 view plus `lows`/`div` CTEs (recent 15-session low
vs the prior 15-session low, mirroring domain.technicals.indicators.rsi_bullish_divergence); downgrade is 0004.
"""
from alembic import op

revision = "0005_screener"
down_revision = "0004_screener_fundamentals"
branch_labels = None
depends_on = None

DROP = "DROP MATERIALIZED VIEW IF EXISTS mv_screener_snapshot"

VIEW_WITH_DIVERGENCE = """
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
), lows AS (
    -- lowest close of the last 15 sessions (is_prior = false) and of the 15 before them, with RSI at each
    SELECT DISTINCT ON (company_id, rn > 15) company_id, rn > 15 AS is_prior, c AS low_c,
           CASE WHEN loss14 = 0 THEN 100.0 ELSE 100 - 100 / (1 + gain14 / loss14) END AS low_rsi
    FROM ind
    WHERE rn <= 30 AND gain14 IS NOT NULL
    ORDER BY company_id, rn > 15, c, rn
), div AS (
    SELECT r.company_id,
           CASE WHEN r.low_c < p.low_c AND r.low_rsi > p.low_rsi THEN 1 ELSE 0 END AS bull
    FROM lows r JOIN lows p ON p.company_id = r.company_id AND p.is_prior AND NOT r.is_prior
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
), fin AS (
    -- latest reported quarter per company (EPS as published; NEPSE filers report it annualized)
    SELECT DISTINCT ON (company_id) company_id, eps, bvps,
           CASE WHEN jsonb_typeof(sector_metrics->'npl_pct') = 'number' THEN (sector_metrics->>'npl_pct')::float8 END AS npl_pct,
           CASE WHEN jsonb_typeof(sector_metrics->'car_pct') = 'number' THEN (sector_metrics->>'car_pct')::float8 END AS car_pct,
           CASE WHEN jsonb_typeof(sector_metrics->'cost_per_mw') = 'number' THEN (sector_metrics->>'cost_per_mw')::float8 END AS cost_per_mw
    FROM quarterly_financials
    ORDER BY company_id, period_end DESC
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
       d.bull AS rsi_bull_div,
       a.pct AS top3_broker_accum_15d_pct,
       f.eps::float8 AS eps,
       f.bvps::float8 AS bvps,
       CASE WHEN f.eps > 0 THEN (l.close / f.eps)::float8 END AS pe,
       CASE WHEN f.bvps > 0 THEN (l.close / f.bvps)::float8 END AS pbv,
       CASE WHEN f.eps > 0 AND f.bvps > 0 THEN sqrt(22.5 * f.eps * f.bvps)::float8 END AS graham_number,
       f.npl_pct,
       f.car_pct,
       f.cost_per_mw
FROM companies co
LEFT JOIN sectors s ON s.id = co.sector_id
LEFT JOIN latest l ON l.company_id = co.id
LEFT JOIN accum a ON a.company_id = co.id
LEFT JOIN div d ON d.company_id = co.id
LEFT JOIN fin f ON f.company_id = co.id
-- tradable common equity and mutual funds only: promoter shares and debentures are separate listings
WHERE co.status = 'ACTIVE' AND co.instrument_type IN ('EQUITY', 'MUTUAL_FUND')
WITH DATA;

CREATE UNIQUE INDEX mv_screener_snapshot_symbol ON mv_screener_snapshot (symbol);
"""

VIEW_0004 = """
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
), fin AS (
    -- latest reported quarter per company (EPS as published; NEPSE filers report it annualized)
    SELECT DISTINCT ON (company_id) company_id, eps, bvps,
           CASE WHEN jsonb_typeof(sector_metrics->'npl_pct') = 'number' THEN (sector_metrics->>'npl_pct')::float8 END AS npl_pct,
           CASE WHEN jsonb_typeof(sector_metrics->'car_pct') = 'number' THEN (sector_metrics->>'car_pct')::float8 END AS car_pct,
           CASE WHEN jsonb_typeof(sector_metrics->'cost_per_mw') = 'number' THEN (sector_metrics->>'cost_per_mw')::float8 END AS cost_per_mw
    FROM quarterly_financials
    ORDER BY company_id, period_end DESC
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
       a.pct AS top3_broker_accum_15d_pct,
       f.eps::float8 AS eps,
       f.bvps::float8 AS bvps,
       CASE WHEN f.eps > 0 THEN (l.close / f.eps)::float8 END AS pe,
       CASE WHEN f.bvps > 0 THEN (l.close / f.bvps)::float8 END AS pbv,
       CASE WHEN f.eps > 0 AND f.bvps > 0 THEN sqrt(22.5 * f.eps * f.bvps)::float8 END AS graham_number,
       f.npl_pct,
       f.car_pct,
       f.cost_per_mw
FROM companies co
LEFT JOIN sectors s ON s.id = co.sector_id
LEFT JOIN latest l ON l.company_id = co.id
LEFT JOIN accum a ON a.company_id = co.id
LEFT JOIN fin f ON f.company_id = co.id
-- tradable common equity and mutual funds only: promoter shares and debentures are separate listings
WHERE co.status = 'ACTIVE' AND co.instrument_type IN ('EQUITY', 'MUTUAL_FUND')
WITH DATA;

CREATE UNIQUE INDEX mv_screener_snapshot_symbol ON mv_screener_snapshot (symbol);
"""


def _statements(sql: str) -> list[str]:
    return [s for s in sql.split(";\n") if s.strip()]


def upgrade() -> None:
    op.execute(DROP)
    for stmt in _statements(VIEW_WITH_DIVERGENCE):
        op.execute(stmt)


def downgrade() -> None:
    op.execute(DROP)
    for stmt in _statements(VIEW_0004):
        op.execute(stmt)
