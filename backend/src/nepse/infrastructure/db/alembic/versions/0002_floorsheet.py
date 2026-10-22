"""Redefine broker_daily as UNION ALL + GROUP BY so day/broker filters reach the aggregates' indexes.

The 0001 FULL JOIN ... USING view hides day/broker behind coalesce(), so Postgres can't push a `day >= x`
or `broker = n` filter into either side and scans every materialized row. Same columns and types.

Revision ID: 0002_floorsheet
Revises: 0001
"""
from alembic import op

revision = "0002_floorsheet"
down_revision = "0001"
branch_labels = None
depends_on = None

UPGRADE = """
CREATE OR REPLACE VIEW broker_daily AS
SELECT day, company_id, broker,
       sum(buy_qty)::BIGINT        AS buy_qty,
       sum(sell_qty)::BIGINT       AS sell_qty,
       sum(buy_amt)                AS buy_amt,
       sum(sell_amt)               AS sell_amt,
       sum(self_trade_qty)::BIGINT AS self_trade_qty
FROM (
    SELECT day, company_id, broker, qty AS buy_qty, 0::BIGINT AS sell_qty, amt AS buy_amt, 0::NUMERIC AS sell_amt,
           self_qty AS self_trade_qty
    FROM broker_buy_daily
    UNION ALL
    SELECT day, company_id, broker, 0, qty, 0, amt, 0
    FROM broker_sell_daily
) sides
GROUP BY day, company_id, broker
"""

DOWNGRADE = """
CREATE OR REPLACE VIEW broker_daily AS
SELECT day, company_id, broker,
       coalesce(b.qty, 0)      AS buy_qty,
       coalesce(s.qty, 0)      AS sell_qty,
       coalesce(b.amt, 0)      AS buy_amt,
       coalesce(s.amt, 0)      AS sell_amt,
       coalesce(b.self_qty, 0) AS self_trade_qty
FROM broker_buy_daily b
FULL JOIN broker_sell_daily s USING (day, company_id, broker)
"""


def upgrade() -> None:
    op.execute(UPGRADE)


def downgrade() -> None:
    op.execute(DOWNGRADE)
