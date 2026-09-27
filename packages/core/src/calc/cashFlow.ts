import { format, startOfMonth } from 'date-fns';
import { Expense, MonthlyInvestmentSummaryItem, UserProfile } from '../types';
import { FIXED_EXPENSE_TAGS, MonthlyData } from '../schemas/expenses';
import {
  financialMonthKeyToLabelDate,
  getFinancialMonthKey,
  getRecentFinancialMonthKeys,
  getSalaryMonthForFinancialMonth,
} from './financialMonth';

function getSalaryForMonth(month: Date, user: UserProfile): number {
  const salaryHistory = user.salaryHistory || [];
  const paymentHistory = user.paymentHistory || [];

  const applicableSalary = salaryHistory
    .filter((record) => new Date(record.effectiveDate) <= month)
    .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())[0];

  if (applicableSalary) return applicableSalary.baseSalary;

  if (paymentHistory.length > 0) {
    const earliest = [...paymentHistory].sort(
      (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()
    )[0];
    return earliest.baseAmount;
  }

  if (salaryHistory.length > 0) {
    const earliest = [...salaryHistory].sort(
      (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
    )[0];
    return earliest.baseSalary;
  }

  return user.monthlySalary || 0;
}

function getPaymentForMonth(month: Date, user: UserProfile) {
  const paymentHistory = user.paymentHistory || [];
  const monthStart = startOfMonth(month);

  const payment = paymentHistory.find(
    (p) => format(new Date(p.month), 'yyyy-MM') === format(monthStart, 'yyyy-MM')
  );

  if (payment) {
    return {
      totalPaid: payment.totalPaid,
      baseAmount: payment.baseAmount,
      bonus: payment.bonus,
      arrears: payment.arrears,
    };
  }

  const effectiveSalary = getSalaryForMonth(month, user);
  return { totalPaid: effectiveSalary, baseAmount: effectiveSalary, bonus: 0, arrears: 0 };
}

// FM(M) is funded by the paycheck of (M-1), which credits at the start of FM(M).
// Resolve the salary lookup to that earlier calendar month.
function getSalaryForFinancialMonth(fmKey: string, user: UserProfile): number {
  const salaryMonthDate = financialMonthKeyToLabelDate(getSalaryMonthForFinancialMonth(fmKey));
  return getSalaryForMonth(salaryMonthDate, user);
}

function getPaymentForFinancialMonth(fmKey: string, user: UserProfile) {
  const salaryMonthDate = financialMonthKeyToLabelDate(getSalaryMonthForFinancialMonth(fmKey));
  return getPaymentForMonth(salaryMonthDate, user);
}

export function buildMonthlyCashFlow(
  user: UserProfile,
  expenses: Expense[] | undefined,
  monthlyInvestmentSummary: MonthlyInvestmentSummaryItem[] | undefined
): MonthlyData[] {
  const fmKeys = getRecentFinancialMonthKeys(12);

  const monthlyData: MonthlyData[] = fmKeys.map((monthKey) => {
    const labelDate = financialMonthKeyToLabelDate(monthKey);
    const monthStr = format(labelDate, 'MMM yyyy');

    const effectiveSalary = getSalaryForFinancialMonth(monthKey, user);
    const payment = getPaymentForFinancialMonth(monthKey, user);

    // Pull pre-aggregated investment totals from backend summary
    const summaryItem = monthlyInvestmentSummary?.find((s) => s.monthKey === monthKey);
    const goldInv = summaryItem?.investments.gold ?? 0;
    const cryptoInv = summaryItem?.investments.crypto ?? 0;
    const stockInv = summaryItem?.investments.stocks ?? 0;
    const mfInv = summaryItem?.investments.mutualFunds ?? 0;
    const rdInv = summaryItem?.investments.rd ?? 0;

    const totalInvestments = goldInv + cryptoInv + stockInv + mfInv + rdInv;
    const investmentsByType: Record<string, number> = {
      Gold: goldInv,
      Crypto: cryptoInv,
      Stocks: stockInv,
      'Mutual Funds': mfInv,
      RD: rdInv,
    };

    let fixedExpenses = 0;
    let variableExpenses = 0;
    const expensesByCategory: Record<string, number> = {};

    expenses?.forEach((exp) => {
      if (exp.createdAt) {
        const createdFmKey = getFinancialMonthKey(new Date(exp.createdAt));
        if (createdFmKey > monthKey) return;
      }

      let monthlyAmount = exp.expenseAmount;
      switch (exp.expenseFrequency) {
        case 'daily':
          monthlyAmount = exp.expenseAmount * 30;
          break;
        case 'weekly':
          monthlyAmount = exp.expenseAmount * 4;
          break;
        case 'yearly':
          monthlyAmount = exp.expenseAmount / 12;
          break;
      }

      if (FIXED_EXPENSE_TAGS.includes(exp.tag)) {
        fixedExpenses += monthlyAmount;
      } else {
        variableExpenses += monthlyAmount;
      }
      expensesByCategory[exp.tag] = (expensesByCategory[exp.tag] || 0) + monthlyAmount;
    });

    const totalExpenses = fixedExpenses + variableExpenses;
    const discretionarySpending = Math.max(0, payment.totalPaid - totalInvestments - fixedExpenses);
    const savingsRate = payment.totalPaid > 0 ? (totalInvestments / payment.totalPaid) * 100 : 0;

    return {
      month: labelDate,
      monthStr,
      salary: effectiveSalary,
      actualPaid: payment.totalPaid,
      bonus: payment.bonus,
      arrears: payment.arrears,
      totalInvestments,
      fixedExpenses,
      variableExpenses,
      totalExpenses,
      discretionarySpending,
      savingsRate,
      investmentsByType,
      expensesByCategory,
    };
  });

  return monthlyData.reverse();
}

export function summariseCashFlow(monthlyAnalysis: MonthlyData[]) {
  if (monthlyAnalysis.length === 0) {
    return {
      avgMonthlyIncome: 0,
      avgMonthlyExpenses: 0,
      avgMonthlyInvestments: 0,
      avgSavingsRate: 0,
      totalInvested: 0,
      totalExpenses: 0,
      avgDiscretionarySpending: 0,
    };
  }

  const totalIncome = monthlyAnalysis.reduce((sum, m) => sum + m.actualPaid, 0);
  const totalExpenses = monthlyAnalysis.reduce((sum, m) => sum + m.totalExpenses, 0);
  const totalInvestments = monthlyAnalysis.reduce((sum, m) => sum + m.totalInvestments, 0);
  const avgSavingsRate =
    monthlyAnalysis.reduce((sum, m) => sum + m.savingsRate, 0) / monthlyAnalysis.length;
  const avgDiscretionarySpending =
    monthlyAnalysis.reduce((sum, m) => sum + m.discretionarySpending, 0) / monthlyAnalysis.length;

  return {
    avgMonthlyIncome: totalIncome / monthlyAnalysis.length,
    avgMonthlyExpenses: totalExpenses / monthlyAnalysis.length,
    avgMonthlyInvestments: totalInvestments / monthlyAnalysis.length,
    avgSavingsRate,
    totalInvested: totalInvestments,
    totalExpenses,
    avgDiscretionarySpending,
  };
}
