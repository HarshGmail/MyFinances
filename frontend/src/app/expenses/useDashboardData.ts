import { useMemo } from 'react';
import Highcharts from 'highcharts';
import { Expense, UserProfile, MonthlyInvestmentSummaryItem } from '@myfinances/core/types';
import { buildMonthlyCashFlow, summariseCashFlow } from '@myfinances/core/calc/cashFlow';

interface UseDashboardDataParams {
  user: UserProfile | undefined;
  expenses: Expense[] | undefined;
  monthlyInvestmentSummary: MonthlyInvestmentSummaryItem[] | undefined;
  theme: string;
}

export function useDashboardData({
  user,
  expenses,
  monthlyInvestmentSummary,
  theme,
}: UseDashboardDataParams) {
  const monthlyAnalysis = useMemo(
    () => (user ? buildMonthlyCashFlow(user, expenses, monthlyInvestmentSummary) : []),
    [user, expenses, monthlyInvestmentSummary]
  );

  const overallStats = useMemo(() => summariseCashFlow(monthlyAnalysis), [monthlyAnalysis]);

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
