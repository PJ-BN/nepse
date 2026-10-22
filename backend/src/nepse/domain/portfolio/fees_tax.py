"""NEPSE secondary-market fees and Nepali capital-gains tax (stdlib only, Decimal throughout).

Sources (checked 2026-10-22):
- Brokerage: SEBON revised schedule effective 2081-02-01 BS (2024-05-14), ~10% cut from the 0.40%..0.27% tiers.
  https://www.sharesansar.com/newsdetail/sebon-to-enact-revised-commission-rates-for-stockbrokers-implementation-begins-today-2024-05-14
- Minimum commission NPR 10, SEBON fee 0.015%, DP NPR 25 per scrip per day: broker schedule
  https://ssl.com.np/trading-commission-and-fees  (a 0.014% SEBON fee was proposed in Oct 2023 but no source
  confirms it was enacted, so 0.015% stays).
- CGT: individuals 5% (>365 days) / 7.5% (<=365 days), institutions 10%, under the Income Tax Act until FY 2082/83.
  Budget FY 2083/84 raised individuals to 7.5% long / 10% short, effective from the fiscal year start
  (Shrawan 1 2083 = 2026-07-17):
  https://www.sharesansar.com/newsdetail/government-increases-capital-gains-tax-on-stock-market-earnings-2026-05-29
  https://nitipartners.com/?p=8891
  No source reports a change to the institutional rate.
"""
from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from enum import StrEnum

D = Decimal
PAISA = D("0.01")

# (effective_from, ((upper_bound_inclusive | None, rate), ...)), newest first.
# The rate of the bracket the whole amount falls in applies to the whole amount (not marginal).
BROKERAGE_SCHEDULE: tuple[tuple[date, tuple[tuple[Decimal | None, Decimal], ...]], ...] = (
    (date(2024, 5, 14), (
        (D(50_000), D("0.0036")),
        (D(500_000), D("0.0033")),
        (D(2_000_000), D("0.0031")),
        (D(10_000_000), D("0.0027")),
        (None, D("0.0024")),
    )),
    (date.min, (
        (D(50_000), D("0.0040")),
        (D(500_000), D("0.0037")),
        (D(2_000_000), D("0.0034")),
        (D(10_000_000), D("0.0030")),
        (None, D("0.0027")),
    )),
)
MIN_BROKERAGE = D(10)
SEBON_FEE_RATE = D("0.00015")
DP_CHARGE = D(25)  # per scrip, per day, per direction

LONG_TERM_AFTER_DAYS = 365  # long-term only when held MORE than 365 days
# (effective_from, short_term_rate, long_term_rate) for resident individuals, newest first.
INDIVIDUAL_CGT_SCHEDULE: tuple[tuple[date, Decimal, Decimal], ...] = (
    (date(2026, 7, 17), D("0.10"), D("0.075")),
    (date.min, D("0.075"), D("0.05")),
)
INSTITUTION_CGT_RATE = D("0.10")
DIVIDEND_TAX_RATE = D("0.05")


class InvestorType(StrEnum):
    INDIVIDUAL = "INDIVIDUAL"
    INSTITUTION = "INSTITUTION"


def money(x: Decimal) -> Decimal:
    return x.quantize(PAISA, ROUND_HALF_UP)


def _effective(schedule, on: date | None):
    on = on or date.max
    return next(row for row in schedule if row[0] <= on)


def brokerage(amount: Decimal, on: date | None = None) -> Decimal:
    _, tiers = _effective(BROKERAGE_SCHEDULE, on)
    rate = next(r for upper, r in tiers if upper is None or amount <= upper)
    return max(money(amount * rate), MIN_BROKERAGE)


def cgt_rate(acquired: date, sold: date, investor: InvestorType) -> Decimal:
    if investor is InvestorType.INSTITUTION:
        return INSTITUTION_CGT_RATE
    _, short, long_ = _effective(INDIVIDUAL_CGT_SCHEDULE, sold)
    return long_ if (sold - acquired).days > LONG_TERM_AFTER_DAYS else short


def dividend_tax(cash_dividend: Decimal) -> Decimal:
    return money(cash_dividend * DIVIDEND_TAX_RATE)


@dataclass(frozen=True)
class TradeFees:
    amount: Decimal
    brokerage: Decimal
    sebon_fee: Decimal
    dp_charge: Decimal

    @property
    def total(self) -> Decimal:
        return self.brokerage + self.sebon_fee + self.dp_charge


def trade_fees(qty: int, rate: Decimal, on: date | None = None) -> TradeFees:
    amount = money(qty * rate)
    # ponytail: DP charged per transaction; two same-day trades in one scrip really pay it once.
    return TradeFees(amount, brokerage(amount, on), money(amount * SEBON_FEE_RATE), DP_CHARGE)


@dataclass(frozen=True)
class BuyCost:
    fees: TradeFees
    total_payable: Decimal
    cost_per_share: Decimal  # unrounded, so qty * cost_per_share == total_payable


def buy_cost(qty: int, rate: Decimal, on: date | None = None) -> BuyCost:
    fees = trade_fees(qty, rate, on)
    total = fees.amount + fees.total
    return BuyCost(fees, total, total / qty)


@dataclass(frozen=True)
class Lot:
    qty: int
    cost_per_share: Decimal  # fees included; 0 for bonus
    acquired: date


@dataclass(frozen=True)
class LotSale:
    lot: Lot  # the slice of the original lot that was sold
    cost_basis: Decimal
    gain: Decimal  # after this slice's share of sell fees, before tax
    long_term: bool
    cgt_rate: Decimal


@dataclass(frozen=True)
class SellResult:
    fees: TradeFees
    cost_basis: Decimal
    gain: Decimal
    cgt: Decimal
    net_receivable: Decimal  # amount - fees - cgt
    sales: tuple[LotSale, ...]
    remaining: tuple[Lot, ...]

    @property
    def realized_pnl(self) -> Decimal:
        return self.net_receivable - self.cost_basis


def sell_proceeds(
    lots: list[Lot] | tuple[Lot, ...], qty: int, rate: Decimal, sell_date: date,
    investor_type: InvestorType = InvestorType.INDIVIDUAL,
) -> SellResult:
    """Consume `lots` FIFO (oldest acquired first) and tax each slice by its own holding period."""
    if qty <= 0:
        raise ValueError("quantity must be positive")
    held = sum(lot.qty for lot in lots)
    if qty > held:
        raise ValueError(f"cannot sell {qty}, only {held} held")
    fees = trade_fees(qty, rate, sell_date)
    fee_per_share = fees.total / qty

    remaining: list[Lot] = []
    sales: list[LotSale] = []
    left = qty
    for lot in sorted(lots, key=lambda lot: lot.acquired):
        take = min(left, lot.qty)
        left -= take
        if take < lot.qty:
            remaining.append(Lot(lot.qty - take, lot.cost_per_share, lot.acquired))
        if take:
            basis = take * lot.cost_per_share
            gain = take * (rate - fee_per_share) - basis
            sales.append(LotSale(Lot(take, lot.cost_per_share, lot.acquired), basis, gain,
                                 (sell_date - lot.acquired).days > LONG_TERM_AFTER_DAYS,
                                 cgt_rate(lot.acquired, sell_date, investor_type)))

    # Net gains and losses within each rate bucket; a net loss in a bucket is taxed at zero.
    # ponytail: no cross-bucket or cross-transaction loss offset; brokers settle CGT per sell like this.
    by_rate: dict[Decimal, Decimal] = {}
    for s in sales:
        by_rate[s.cgt_rate] = by_rate.get(s.cgt_rate, D(0)) + s.gain
    cgt = money(sum((max(g, D(0)) * r for r, g in by_rate.items()), D(0)))

    cost_basis = money(sum((s.cost_basis for s in sales), D(0)))
    gain = fees.amount - fees.total - cost_basis
    return SellResult(fees, cost_basis, gain, cgt, fees.amount - fees.total - cgt, tuple(sales), tuple(remaining))
