from datetime import datetime

import pytest

from nepse.domain.calendar.npt import NPT
from nepse.domain.floorsheet.metrics import (
    BrokerDay, Trade, atr_pct, bar, cornering_alert, cornering_index, is_accumulating, is_wash, is_whale,
    operator_margin, positions, sankey, top_net_share, total_volume, unrealised_pl, vwap,
)

# 1000 shares changed hands. Nets: #1 +500, #2 +100, #3 -300, #4 -300.
ROWS = [
    BrokerDay(1, 400, 100, 40_000, 11_000),
    BrokerDay(1, 200, 0, 20_000, 0),  # second day for broker 1: buy 600 @ 100 in total
    BrokerDay(2, 300, 200, 33_000, 20_000),
    BrokerDay(3, 100, 400, 10_000, 42_000),
    BrokerDay(4, 0, 300, 0, 30_000),
]


def by_broker():
    return {p.broker: p for p in positions(ROWS)}


def test_positions_and_vwap():
    p = by_broker()
    assert (p[1].buy_qty, p[1].sell_qty, p[1].net) == (600, 100, 500)
    assert p[1].buy_vwap == 100 and p[1].sell_vwap == 110
    assert p[3].sell_vwap == 105
    assert p[4].buy_vwap is None
    assert vwap(0, 0) is None
    assert total_volume(p.values()) == 1000


def test_bar():
    assert bar(600, 100, 1000) == 0.5
    assert bar(0, 300, 1000) == -0.3
    assert bar(1, 0, 0) == 0.0


def test_operator_margin_and_unrealised_pl():
    p = by_broker()
    assert operator_margin(120, 100) == pytest.approx(0.2)
    assert operator_margin(120, None) is None
    assert unrealised_pl(p[1], 120) == 500 * 20          # long, marked against buy VWAP 100
    assert unrealised_pl(p[3], 120) == -300 * (120 - 105)  # short, marked against sell VWAP 105
    assert unrealised_pl(p[1], None) is None


def test_cornering_index_and_alert():
    ps = positions(ROWS)
    assert cornering_index(ps) == pytest.approx(0.6)  # only two net buyers: (500 + 100) / 1000
    assert top_net_share(ps, 1) == pytest.approx(0.5)
    assert cornering_alert(0.6, 1_000_000_000)
    assert not cornering_alert(0.6, 2_000_000_000)
    assert not cornering_alert(0.4, 1_000_000_000)
    assert not cornering_alert(0.6, None)


def test_wash_exclusion():
    rows = [BrokerDay(1, 500, 100, 50_000, 10_000, self_trade_qty=100), BrokerDay(2, 0, 400, 0, 40_000)]
    p = {x.broker: x for x in positions(rows, exclude_wash=True)}
    assert (p[1].buy_qty, p[1].sell_qty, p[1].buy_amt, p[1].sell_amt) == (400, 0, 40_000, 0)
    assert p[1].net == 400  # wash trades never change net
    assert total_volume(p.values()) == 400


def trade(buyer, seller, qty, rate):
    return Trade(1, "X", buyer, seller, qty, rate, qty * rate, datetime(2025, 4, 20, 11, tzinfo=NPT))


def test_wash_and_whale_filters():
    assert is_wash(trade(5, 5, 10, 100))
    assert not is_wash(trade(5, 6, 10, 100))
    assert is_whale(trade(1, 2, 5_000, 1))
    assert is_whale(trade(1, 2, 10, 250_000))     # amount 2.5M
    assert not is_whale(trade(1, 2, 4_999, 500))  # 2,499,500


def test_atr_and_accumulation():
    atr = atr_pct([(102, 98, 100), (103, 99, 101)])  # TRs 4 and 4
    assert atr == pytest.approx(4 / 101)
    assert atr_pct([]) is None
    assert is_accumulating(0.36, atr)
    assert not is_accumulating(0.35, atr)
    assert not is_accumulating(0.5, 0.05)
    assert not is_accumulating(0.5, None)


def test_sankey():
    flows = [(1, 2, 100), (1, 2, 50), (3, 3, 1_000), (2, 1, 30), (4, 1, 200)]
    assert sankey(flows, 2) == [(4, 1, 200), (1, 2, 150)]
