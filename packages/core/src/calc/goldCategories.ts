import type { GoldCategory, GoldTransaction } from '../types';

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
