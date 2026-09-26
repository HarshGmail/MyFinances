import { useMemo } from 'react';
import type { GoldLease, GoldTransaction } from '../types';
import { getGoldCategory } from '../calc/goldCategories';

export interface LeaseMonth {
  key: string;
  label: string;
  grossGrams: number;
  tdsGrams: number;
  netGrams: number;
}

const MONTH_LABEL = new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' });

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function payoutMonthOf(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

export function isLeaseActive(lease: GoldLease, today = new Date()): boolean {
  return new Date(lease.endDate) >= today;
}

export function useGoldLeaseData(transactions: GoldTransaction[] | undefined, leases: GoldLease[]) {
  const months = useMemo(() => {
    const byMonth = new Map<string, LeaseMonth>();
    for (const tx of transactions ?? []) {
      const category = getGoldCategory(tx);
      if (category !== 'lease_interest' && category !== 'lease_tds') continue;

      const earnedMonth = payoutMonthOf(new Date(tx.date));
      const key = toMonthKey(earnedMonth);
      if (!byMonth.has(key)) {
        byMonth.set(key, {
          key,
          label: MONTH_LABEL.format(earnedMonth),
          grossGrams: 0,
          tdsGrams: 0,
          netGrams: 0,
        });
      }
      const month = byMonth.get(key)!;
      if (category === 'lease_interest') month.grossGrams += tx.quantity;
      else month.tdsGrams += tx.quantity;
      month.netGrams = month.grossGrams - month.tdsGrams;
    }
    return [...byMonth.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [transactions]);

  const totals = useMemo(() => {
    const grossGrams = months.reduce((sum, m) => sum + m.grossGrams, 0);
    const tdsGrams = months.reduce((sum, m) => sum + m.tdsGrams, 0);
    return { grossGrams, tdsGrams, netGrams: grossGrams - tdsGrams };
  }, [months]);

  const activeLeases = useMemo(
    () =>
      leases
        .filter((lease) => isLeaseActive(lease))
        .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()),
    [leases]
  );

  const activeLeaseStats = useMemo(() => {
    const leasedGrams = activeLeases.reduce((sum, lease) => sum + lease.leasedGrams, 0);
    const weightedYield = activeLeases.reduce(
      (sum, lease) => sum + lease.leasedGrams * lease.yieldPercent,
      0
    );
    const averageYield = leasedGrams > 0 ? weightedYield / leasedGrams : 0;
    const expectedMonthlyGrams = (leasedGrams * averageYield) / 100 / 12;
    return { leasedGrams, averageYield, expectedMonthlyGrams };
  }, [activeLeases]);

  return {
    months,
    totals,
    latestMonth: months.at(-1) ?? null,
    activeLeases,
    activeLeaseStats,
  };
}
