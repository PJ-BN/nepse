from datetime import date
from decimal import Decimal as D

import pytest

from nepse.domain.portfolio.fees_tax import InvestorType, Lot, brokerage, buy_cost, cgt_rate, sell_proceeds
from nepse.domain.portfolio.wacc import Txn, TxnType, replay


def test_buy_cost_worked_example():
    c = buy_cost(100, D(500), date(2025, 1, 1))  # 50,000 sits in the <= 50k tier
    assert c.fees.brokerage == D("180.00")
    assert c.fees.sebon_fee == D("7.50")
    assert c.fees.dp_charge == D(25)
    assert c.total_payable == D("50212.50")
    assert c.cost_per_share == D("502.125")


def test_brokerage_tiers_minimum_and_history():
    assert brokerage(D(50_100)) == D("165.33")  # 0.33%
    assert brokerage(D(600_000)) == D("1860.00")  # 0.31%
    assert brokerage(D(3_000_000)) == D("8100.00")  # 0.27%
    assert brokerage(D(20_000_000)) == D("48000.00")  # 0.24%
    assert brokerage(D(100)) == D(10)  # minimum
    assert brokerage(D(50_000), date(2024, 5, 13)) == D("200.00")  # pre-2024-05-14 schedule, 0.40%


def test_bonus_then_right_lowers_wacc():
    pos = replay([
        Txn(TxnType.BUY, 100, D(500), date(2025, 1, 1)),
        Txn(TxnType.BONUS, 10, D(0), date(2025, 3, 1)),
        Txn(TxnType.RIGHT, 110, D(100), date(2025, 4, 1)),
    ])
    assert pos.qty == 220
    assert pos.total_cost == D("61212.50")
    assert round(pos.wacc, 4) == D("278.2386")
    assert [lot.cost_per_share for lot in pos.lots] == [D("502.125"), D(0), D(100)]


def test_ipo_has_no_brokerage():
    pos = replay([Txn(TxnType.IPO, 10, D(100), date(2025, 1, 1))])
    assert pos.total_cost == D(1000) and pos.wacc == D(100)


LOTS = [Lot(100, D("502.125"), date(2024, 6, 1)), Lot(100, D("602.32"), date(2025, 9, 1))]


def test_partial_sell_spanning_short_and_long_lots():
    r = sell_proceeds(LOTS, 150, D(800), date(2025, 10, 1))
    assert r.fees.total == D(439)  # 396 brokerage + 18 SEBON + 25 DP
    assert [(s.lot.qty, s.long_term, s.cgt_rate) for s in r.sales] == [(100, True, D("0.05")), (50, False, D("0.075"))]
    assert r.cgt == D("2205.07")
    assert r.net_receivable == D("117355.93")
    assert r.cost_basis == D("80328.50")
    assert r.realized_pnl == D("37027.43")
    assert r.remaining == (Lot(50, D("602.32"), date(2025, 9, 1)),)


def test_fy_2083_84_cgt_rates_and_institutions():
    r = sell_proceeds(LOTS, 150, D(800), date(2026, 8, 1))  # 7.5% long / 10% short from 2026-07-17
    assert r.cgt == D("3185.88")
    assert sell_proceeds(LOTS, 150, D(800), date(2025, 10, 1), InvestorType.INSTITUTION).cgt == D("3923.25")


def test_365_days_is_still_short_term():
    assert cgt_rate(date(2024, 1, 1), date(2024, 12, 31), InvestorType.INDIVIDUAL) == D("0.075")  # 365 days
    assert cgt_rate(date(2024, 1, 1), date(2025, 1, 1), InvestorType.INDIVIDUAL) == D("0.05")  # 366 days


def test_loss_pays_no_cgt():
    r = sell_proceeds([Lot(10, D(500), date(2025, 1, 1))], 10, D(400), date(2025, 2, 1))
    assert r.cgt == 0 and r.realized_pnl < 0


def test_sell_keeps_wacc_but_uses_fifo_for_tax():
    pos = replay([
        Txn(TxnType.BUY, 100, D(500), date(2024, 6, 1)),
        Txn(TxnType.BUY, 100, D(600), date(2025, 9, 1)),
        Txn(TxnType.SELL, 150, D(800), date(2025, 10, 1)),
    ])
    assert pos.qty == 50
    assert pos.wacc == D("552.2225")
    assert pos.lots == [Lot(50, D("602.32"), date(2025, 9, 1))]
    assert pos.sells[0][1].cgt == D("2205.07")


def test_oversell_rejected():
    with pytest.raises(ValueError):
        replay([Txn(TxnType.BUY, 10, D(500), date(2025, 1, 1)), Txn(TxnType.SELL, 11, D(500), date(2025, 1, 2))])
