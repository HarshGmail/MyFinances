import type { GoldCategory, GoldTransaction } from '../types';
import xirr from './xirr';

export const GOLD_CATEGORY_LABELS: Record<GoldCategory, string> = {
  purchase: 'Purchase',
  sale: 'Sale',
  lease_interest: 'Lease Interest',
  lease_tds: 'Lease TDS',
};

export function getGoldCategory(tx: Pick<GoldTransaction, 'type' | 'category'>): GoldCategory {
  return tx.category ?? (tx.type === 'credit' ? 'purchase' : 'sale');
}

export function isLeaseCategory(category: GoldCategory): boolean {
  return category === 'lease_interest' || category === 'lease_tds';
}

type GoldHolding = Pick<GoldTransaction, 'type' | 'category' | 'quantity' | 'amount'>;

export function signedGoldGrams(tx: GoldHolding): number {
  return tx.type === 'credit' ? tx.quantity : -tx.quantity;
}

export function goldCashFlow(tx: GoldHolding): number {
  if (isLeaseCategory(getGoldCategory(tx))) return 0;
  return tx.type === 'credit' ? -tx.amount : tx.amount;
}

export function netGoldInvested(transactions: GoldHolding[]): number {
  return transactions.reduce((sum, tx) => sum - goldCashFlow(tx), 0);
}

export function totalGoldGrams(transactions: GoldHolding[]): number {
  return transactions.reduce((sum, tx) => sum + signedGoldGrams(tx), 0);
}

export interface GoldStats {
  totalGold: number;
  totalInvested: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
  xirrValue: number | null;
  avgPrice: number;
  currentPrice: number;
}

type DatedGoldHolding = GoldHolding & Pick<GoldTransaction, 'date'>;

export function computeGoldStats(
  transactions: DatedGoldHolding[],
  currentRate: number,
  asOf: Date = new Date()
): GoldStats {
  const totalGold = totalGoldGrams(transactions);
  const totalInvested = netGoldInvested(transactions);
  const currentValue = totalGold * currentRate;
  const profitLoss = currentValue - totalInvested;
  const cashFlows = transactions
    .map((tx) => ({ amount: goldCashFlow(tx), when: new Date(tx.date) }))
    .filter((flow) => flow.amount !== 0);
  let xirrValue: number | null = null;
  try {
    xirrValue = xirr([...cashFlows, { amount: currentValue, when: asOf }]) * 100;
  } catch {
    xirrValue = null;
  }
  return {
    totalGold,
    totalInvested,
    currentValue,
    profitLoss,
    profitLossPercentage: totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0,
    xirrValue,
    avgPrice: totalGold > 0 ? totalInvested / totalGold : 0,
    currentPrice: currentRate,
  };
}
