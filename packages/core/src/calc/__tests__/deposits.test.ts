import { describe, expect, it } from 'vitest';
import {
  quarterlyCompoundInterest,
  simpleInterestAccrued,
  summariseFixedDeposits,
  summariseRecurringDeposits,
} from '../deposits';
import { FixedDeposit, RecurringDeposit } from '../../types';

const deposit = { _id: 'd1', userId: 'u1', platform: 'Bank' };

describe('deposit interest', () => {
  it('compounds quarterly and adds simple interest for leftover months', () => {
    const oneYear = quarterlyCompoundInterest(100000, 8, 12);
    expect(oneYear).toBeCloseTo(100000 * (1.02 ** 4 - 1), 6);
    const fourteenMonths = quarterlyCompoundInterest(100000, 8, 14);
    expect(fourteenMonths).toBeCloseTo(100000 * (1.02 ** 4 * (1 + (8 / 1200) * 2) - 1), 6);
  });

  it('accrues simple interest per day on a 365-day year', () => {
    expect(simpleInterestAccrued(36500, 10, 100)).toBeCloseTo(1000, 6);
  });

  it('caps FD accrual at maturity and sums invested vs value', () => {
    const fd: FixedDeposit = {
      ...deposit,
      fixedDepositName: 'FD',
      amountInvested: 36500,
      rateOfInterest: 10,
      dateOfCreation: new Date('2024-01-01'),
      dateOfMaturity: new Date('2025-01-01'),
    };
    const afterMaturity = summariseFixedDeposits([fd], new Date('2026-06-01'));
    expect(afterMaturity.invested).toBe(36500);
    expect(afterMaturity.currentValue).toBeCloseTo(36500 + 3660, 6);
    expect(afterMaturity.profitLossPercentage).toBeCloseTo((3660 / 36500) * 100, 6);
  });

  it('returns zeros for an empty RD list', () => {
    expect(summariseRecurringDeposits([])).toEqual({
      invested: 0,
      currentValue: 0,
      profitLoss: 0,
      profitLossPercentage: 0,
    });
  });

  it('values an RD by completed months', () => {
    const rd: RecurringDeposit = {
      ...deposit,
      recurringDepositName: 'RD',
      amountInvested: 12000,
      monthlyDeposit: 1000,
      rateOfInterest: 8,
      dateOfCreation: new Date('2025-01-01'),
      dateOfMaturity: new Date('2027-01-01'),
    };
    const summary = summariseRecurringDeposits([rd], new Date('2026-01-01'));
    expect(summary.currentValue).toBeCloseTo(12000 * 1.02 ** 4, 6);
  });
});
