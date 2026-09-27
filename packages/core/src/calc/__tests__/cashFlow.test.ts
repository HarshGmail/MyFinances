import { describe, expect, it } from 'vitest';
import { buildMonthlyCashFlow, summariseCashFlow } from '../cashFlow';
import { calculateEPFGrowth } from '../epfProjection';
import { fixedDepositMaturityAmount, recurringDepositMaturityAmount } from '../deposits';
import { getRecentFinancialMonthKeys } from '../financialMonth';
import { EpfAccount, Expense, FixedDeposit, RecurringDeposit, UserProfile } from '../../types';

const user = {
  userName: 'T',
  userEmail: 't@x.co',
  monthlySalary: 100000,
} as UserProfile;

describe('cash flow', () => {
  it('builds 12 months, newest first, normalising recurring expense frequency', () => {
    const expenses = [
      { tag: 'Rent', expenseAmount: 20000, expenseFrequency: 'monthly', expenseName: 'Rent' },
      { tag: 'Food & Dining', expenseAmount: 100, expenseFrequency: 'daily', expenseName: 'Tea' },
      { tag: 'Insurance', expenseAmount: 12000, expenseFrequency: 'yearly', expenseName: 'LIC' },
    ] as Expense[];
    const newest = getRecentFinancialMonthKeys(12).at(-1)!;
    const months = buildMonthlyCashFlow(user, expenses, [
      {
        monthKey: newest,
        investments: { stocks: 30000, mutualFunds: 10000, gold: 0, crypto: 0, rd: 0 },
      },
    ] as never);

    expect(months).toHaveLength(12);
    expect(months[0].fixedExpenses).toBe(21000);
    expect(months[0].variableExpenses).toBe(3000);
    expect(months[0].totalInvestments).toBe(40000);
    expect(months[0].savingsRate).toBeCloseTo(40, 6);
    expect(months[0].discretionarySpending).toBe(100000 - 40000 - 21000);

    const stats = summariseCashFlow(months);
    expect(stats.avgMonthlyIncome).toBe(100000);
    expect(stats.totalInvested).toBe(40000);
  });

  it('returns zeros for no months', () => {
    expect(summariseCashFlow([]).avgSavingsRate).toBe(0);
  });
});

describe('epf projection', () => {
  it('projects to retirement and discounts for inflation', () => {
    const accounts = [
      { _id: 'a', organizationName: 'X', epfAmount: 10000, creditDay: 1, startDate: '2020-01-01' },
    ] as EpfAccount[];
    const { yearlyData, summary } = calculateEPFGrowth(accounts, '1995-01-01', 6);
    expect(yearlyData.length).toBeGreaterThan(0);
    expect(summary!.finalBalance).toBeGreaterThan(summary!.totalContributed);
    expect(summary!.finalBalanceReal).toBeLessThan(summary!.finalBalance);
  });
});

describe('deposit maturity', () => {
  it('adds full-term interest', () => {
    const fd = {
      amountInvested: 36500,
      rateOfInterest: 10,
      dateOfCreation: new Date('2024-01-01'),
      dateOfMaturity: new Date('2025-01-01'),
    } as FixedDeposit;
    expect(fixedDepositMaturityAmount(fd)).toBeCloseTo(36500 + 3660, 6);
    const rd = {
      amountInvested: 12000,
      rateOfInterest: 8,
      dateOfCreation: new Date('2025-01-01'),
      dateOfMaturity: new Date('2026-01-01'),
    } as RecurringDeposit;
    expect(recurringDepositMaturityAmount(rd)).toBeCloseTo(12000 * 1.02 ** 4, 6);
  });
});
