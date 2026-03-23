import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import Highcharts from 'highcharts';
import { Expense, UserProfile, MonthlyInvestmentSummaryItem } from '@/api/dataInterface';
import { MonthlyData, FIXED_EXPENSE_TAGS } from './types';

interface UseDashboardDataParams {
  user: UserProfile | undefined;
  expenses: Expense[] | undefined;
  monthlyInvestmentSummary: MonthlyInvestmentSummaryItem[] | undefined;
  theme: string;
}

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

export function useDashboardData({
  user,
  expenses,
  monthlyInvestmentSummary,
  theme,
}: UseDashboardDataParams) {
  const monthlyAnalysis = useMemo(() => {
    if (!user) return [];

    const endDate = new Date();
    const startDate = subMonths(endDate, 11);
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    const monthlyData: MonthlyData[] = months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthStr = format(month, 'MMM yyyy');
      const monthKey = format(month, 'yyyy-MM');

      const effectiveSalary = getSalaryForMonth(month, user);
      const payment = getPaymentForMonth(month, user);

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
        // Only count this expense from the month it was created (timestamp fix)
        if (exp.createdAt) {
          const expCreatedDate = startOfMonth(new Date(exp.createdAt));
          if (expCreatedDate > monthEnd) return;
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
      const discretionarySpending = Math.max(
        0,
        payment.totalPaid - totalInvestments - fixedExpenses
      );
      const savingsRate = payment.totalPaid > 0 ? (totalInvestments / payment.totalPaid) * 100 : 0;

      return {
        month,
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
  }, [user, expenses, monthlyInvestmentSummary]);

  const overallStats = useMemo(() => {
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
  }, [monthlyAnalysis]);

  const cashFlowChartOptions = useMemo(() => {
    const categories = monthlyAnalysis.map((m) => m.monthStr).reverse();
    const textColor = theme === 'dark' ? '#fff' : '#18181b';
    return {
      chart: { type: 'column', backgroundColor: 'transparent', height: 400 },
      title: {
        text: 'Monthly Cash Flow Analysis',
        style: { color: textColor, fontSize: '18px', fontWeight: '600' },
      },
      xAxis: { categories, labels: { style: { color: textColor } } },
      yAxis: {
        title: { text: 'Amount (₹)', style: { color: textColor } },
        labels: {
          formatter: function (this: Highcharts.AxisLabelsFormatterContextObject): string {
            return '₹' + ((this.value as number) / 1000).toFixed(0) + 'k';
          },
          style: { color: textColor },
        },
      },
      tooltip: {
        shared: true,
        formatter: function (this: { x: string; points?: Highcharts.Point[] }): string {
          let s = '<b>' + this.x + '</b><br/>';
          this.points?.forEach((point: Highcharts.Point) => {
            s +=
              '<span style="color:' +
              point.color +
              '">\u25CF</span> ' +
              point.series.name +
              ': ₹' +
              (point.y || 0).toLocaleString('en-IN') +
              '<br/>';
          });
          return s;
        },
      },
      plotOptions: { column: { stacking: 'normal' } },
      series: [
        {
          name: 'Income',
          data: monthlyAnalysis.map((m) => m.actualPaid).reverse(),
          color: '#10b981',
          stack: 'income',
        },
        {
          name: 'Investments',
          data: monthlyAnalysis.map((m) => m.totalInvestments).reverse(),
          color: '#3b82f6',
          stack: 'outflow',
        },
        {
          name: 'Fixed Expenses',
          data: monthlyAnalysis.map((m) => m.fixedExpenses).reverse(),
          color: '#ef4444',
          stack: 'outflow',
        },
        {
          name: 'Variable Expenses',
          data: monthlyAnalysis.map((m) => m.variableExpenses).reverse(),
          color: '#f97316',
          stack: 'outflow',
        },
      ],
      credits: { enabled: false },
      legend: { itemStyle: { color: textColor } },
    };
  }, [monthlyAnalysis, theme]);

  const savingsRateChartOptions = useMemo(() => {
    const textColor = theme === 'dark' ? '#fff' : '#18181b';
    return {
      chart: { type: 'line', backgroundColor: 'transparent', height: 300 },
      title: {
        text: 'Savings Rate Trend',
        style: { color: textColor, fontSize: '16px', fontWeight: '600' },
      },
      xAxis: {
        categories: monthlyAnalysis.map((m) => m.monthStr).reverse(),
        labels: { style: { color: textColor } },
      },
      yAxis: {
        title: { text: 'Savings Rate (%)', style: { color: textColor } },
        labels: {
          formatter: function (this: Highcharts.AxisLabelsFormatterContextObject): string {
            return (this.value as number).toFixed(0) + '%';
          },
          style: { color: textColor },
        },
        plotLines: [
          {
            value: 70,
            color: '#10b981',
            dashStyle: 'Dash',
            width: 2,
            label: { text: 'Target: 70%', style: { color: textColor } },
          },
        ],
      },
      series: [
        {
          name: 'Savings Rate',
          data: monthlyAnalysis.map((m) => m.savingsRate).reverse(),
          color: '#8b5cf6',
          marker: { enabled: true, radius: 4 },
        },
      ],
      credits: { enabled: false },
      legend: { enabled: false },
    };
  }, [monthlyAnalysis, theme]);

  return {
    monthlyAnalysis,
    currentMonthData: monthlyAnalysis[0] ?? null,
    overallStats,
    cashFlowChartOptions,
    savingsRateChartOptions,
  };
}
