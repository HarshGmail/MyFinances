import xirr, { XirrTransaction } from './xirr';

const PERCENT = 100;

export interface DatedCashTransaction {
  type: 'credit' | 'debit';
  amount: number;
  date: string | Date;
}

export function holdingXirrPercent(
  transactions: DatedCashTransaction[],
  currentValue: number,
  asOf: Date = new Date()
): number | null {
  if (!transactions.length || currentValue <= 0) return null;
  const cashFlows: XirrTransaction[] = [
    ...transactions.map((tx) => ({
      amount: tx.type === 'credit' ? -tx.amount : tx.amount,
      when: new Date(tx.date),
    })),
    { amount: currentValue, when: asOf },
  ];
  try {
    return xirr(cashFlows) * PERCENT;
  } catch {
    return null;
  }
}
