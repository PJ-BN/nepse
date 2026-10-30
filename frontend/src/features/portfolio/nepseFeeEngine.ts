import type { InvestorType } from "./types";

export type FeeBreakdown = {
  amount: number;
  brokerage: number;
  sebon_fee: number;
  dp_charge: number;
  total_fees: number;
  total_payable?: number;
  cost_per_share?: number;
  net_receivable?: number;
  cgt?: number;
  realized_pnl?: number;
};

export function calculateNepseBrokerage(amount: number): number {
  if (amount <= 0) return 0;
  let commission = 0;
  if (amount <= 50_000) {
    commission = amount * 0.0040;
  } else if (amount <= 500_000) {
    commission = 50_000 * 0.0040 + (amount - 50_000) * 0.0037;
  } else if (amount <= 2_000_000) {
    commission = 50_000 * 0.0040 + 450_000 * 0.0037 + (amount - 500_000) * 0.0034;
  } else if (amount <= 10_000_000) {
    commission = 50_000 * 0.0040 + 450_000 * 0.0037 + 1_500_000 * 0.0034 + (amount - 2_000_000) * 0.0030;
  } else {
    commission =
      50_000 * 0.0040 +
      450_000 * 0.0037 +
      1_500_000 * 0.0034 +
      8_000_000 * 0.0030 +
      (amount - 10_000_000) * 0.0027;
  }
  return Math.max(10, Math.round(commission * 100) / 100);
}

export function computeBuyFees(qty: number, rate: number, isIpoOrBonus = false): FeeBreakdown {
  const amount = Math.round(qty * rate * 100) / 100;
  if (isIpoOrBonus) {
    return {
      amount,
      brokerage: 0,
      sebon_fee: 0,
      dp_charge: 0,
      total_fees: 0,
      total_payable: amount,
      cost_per_share: qty > 0 ? amount / qty : 0,
    };
  }

  const brokerage = calculateNepseBrokerage(amount);
  const sebon_fee = Math.round(amount * 0.00015 * 100) / 100;
  const dp_charge = 25;
  const total_fees = Math.round((brokerage + sebon_fee + dp_charge) * 100) / 100;
  const total_payable = Math.round((amount + total_fees) * 100) / 100;
  const cost_per_share = qty > 0 ? Math.round((total_payable / qty) * 100) / 100 : 0;

  return {
    amount,
    brokerage,
    sebon_fee,
    dp_charge,
    total_fees,
    total_payable,
    cost_per_share,
  };
}

export function computeSellFees(
  qty: number,
  rate: number,
  wacc: number,
  holdingDays = 180,
  investorType: InvestorType = "INDIVIDUAL"
): FeeBreakdown {
  const amount = Math.round(qty * rate * 100) / 100;
  const brokerage = calculateNepseBrokerage(amount);
  const sebon_fee = Math.round(amount * 0.00015 * 100) / 100;
  const dp_charge = 25;
  const total_fees = Math.round((brokerage + sebon_fee + dp_charge) * 100) / 100;

  const cost_basis = Math.round(qty * wacc * 100) / 100;
  const net_before_tax = amount - total_fees;
  const capital_gain = net_before_tax - cost_basis;

  let cgtRate = 0.075; // Short term individual (<= 365 days)
  if (investorType === "INSTITUTION") {
    cgtRate = 0.10;
  } else if (holdingDays > 365) {
    cgtRate = 0.05; // Long term individual (> 365 days)
  }

  const cgt = capital_gain > 0 ? Math.round(capital_gain * cgtRate * 100) / 100 : 0;
  const net_receivable = Math.round((net_before_tax - cgt) * 100) / 100;
  const realized_pnl = Math.round((net_receivable - cost_basis) * 100) / 100;

  return {
    amount,
    brokerage,
    sebon_fee,
    dp_charge,
    total_fees,
    cgt,
    net_receivable,
    realized_pnl,
  };
}
