-- Phase 1 acceptance: 10M synthetic floorsheet rows, compression on, broker matrix < 50ms.
-- Run against a throwaway database (see bench_floorsheet.sh), never the dev DB.
\timing on

INSERT INTO companies (symbol, name, sector_id)
SELECT 'SYN' || lpad(i::text, 3, '0'), 'Synthetic ' || i, 1 + (i % 13)
FROM generate_series(1, 280) i;

-- ~150k trades per trading day over ~67 days, 10:30-15:00 NPT (04:45-09:15 UTC).
INSERT INTO floorsheet_ticks (trade_time, contract_no, company_id, buyer_broker, seller_broker, qty, rate, amount)
SELECT ts, g, c, b, s, q, r, q * r
FROM (
    SELECT g,
           date_trunc('day', now() - interval '67 days') + ((g / 150000) * interval '1 day')
             + interval '4 hours 45 minutes' + random() * interval '4 hours 30 minutes' AS ts,
           1 + floor(random() * 280)::int AS c,
           1 + floor(random() * 90)::int  AS b,
           1 + floor(random() * 90)::int  AS s,
           10 + floor(random() * 2000)::int AS q,
           round((100 + random() * 1900)::numeric, 2) AS r
    FROM generate_series(1, 10000000) g
) t;

CALL refresh_continuous_aggregate('broker_buy_daily', NULL, NULL);
CALL refresh_continuous_aggregate('broker_sell_daily', NULL, NULL);
SELECT count(compress_chunk(c, if_not_compressed => true)) AS compressed_chunks
FROM show_chunks('floorsheet_ticks', older_than => interval '7 days') c;
ANALYZE;

SELECT count(*) AS rows FROM floorsheet_ticks;
SELECT pg_size_pretty(before_compression_total_bytes) AS before, pg_size_pretty(after_compression_total_bytes) AS after
FROM hypertable_compression_stats('floorsheet_ticks');

-- The query the accept criterion is about: broker matrix for one symbol over 30 days.
EXPLAIN (ANALYZE, BUFFERS)
SELECT broker,
       sum(buy_qty) AS buy_qty, sum(sell_qty) AS sell_qty, sum(buy_qty) - sum(sell_qty) AS net,
       sum(buy_amt) / nullif(sum(buy_qty), 0) AS buy_vwap,
       sum(sell_amt) / nullif(sum(sell_qty), 0) AS sell_vwap
FROM broker_daily
WHERE company_id = 42 AND day >= now() - interval '30 days'
GROUP BY broker
ORDER BY net DESC;
