import { useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  subDays,
} from 'date-fns';
import Highcharts from 'highcharts';
import { ExpenseTransaction } from '@/api/dataInterface';

interface UseTrackerDataParams {
  expenseTransactions: ExpenseTransaction[] | undefined;
  theme: string;
}

export function useTrackerData({ expenseTransactions, theme }: UseTrackerDataParams) {
  const txs = expenseTransactions || [];
  const textColor = theme === 'dark' ? '#fff' : '#18181b';

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const inRange = (date: Date, start: Date, end: Date) => date >= start && date <= end;

    return {
      toDay: txs
        .filter((t) => inRange(new Date(t.date), todayStart, todayEnd))
        .reduce((s, t) => s + t.amount, 0),
      thisWeek: txs
        .filter((t) => inRange(new Date(t.date), weekStart, weekEnd))
        .reduce((s, t) => s + t.amount, 0),
      thisMonth: txs
        .filter((t) => inRange(new Date(t.date), monthStart, monthEnd))
        .reduce((s, t) => s + t.amount, 0),
      total: txs.reduce((s, t) => s + t.amount, 0),
    };
  }, [txs]);

  const timelineOptions = useMemo(() => {
    const now = new Date();
    const days = eachDayOfInterval({ start: subDays(now, 29), end: now });

    const data = days.map((day) => {
      const ds = startOfDay(day);
      const de = endOfDay(day);
      const total = txs
        .filter((t) => {
          const d = new Date(t.date);
          return d >= ds && d <= de;
        })
        .reduce((s, t) => s + t.amount, 0);
      return [day.getTime(), total];
    });

    return {
      chart: { type: 'area', backgroundColor: 'transparent', height: 280 },
      title: {
        text: 'Last 30 Days',
        style: { color: textColor, fontSize: '16px', fontWeight: '600' },
      },
      xAxis: { type: 'datetime', labels: { style: { color: textColor }, format: '{value:%d %b}' } },
      yAxis: {
        title: { text: null },
        labels: {
          formatter: function (this: Highcharts.AxisLabelsFormatterContextObject): string {
            return '₹' + ((this.value as number) / 1000).toFixed(0) + 'k';
          },
          style: { color: textColor },
        },
      },
      tooltip: {
        formatter: function (this: { x: number; y: number }): string {
          return (
            '<b>' +
            format(new Date(this.x), 'dd MMM yyyy') +
            '</b><br/>₹' +
            (this.y || 0).toLocaleString('en-IN')
          );
        },
      },
      series: [
        {
          name: 'Spending',
          data,
          color: '#f97316',
          fillOpacity: 0.15,
          lineWidth: 2,
          marker: { enabled: false },
        },
      ],
      credits: { enabled: false },
      legend: { enabled: false },
    };
  }, [txs, textColor]);

  const categoryOptions = useMemo(() => {
    const byCategory: Record<string, number> = {};
    txs.forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    });

    const seriesData = Object.entries(byCategory)
      .filter(([, v]) => v > 0)
      .map(([name, y]) => ({ name, y }))
      .sort((a, b) => b.y - a.y);

    return {
      chart: { type: 'pie', backgroundColor: 'transparent', height: 280 },
      title: {
        text: 'By Category',
        style: { color: textColor, fontSize: '16px', fontWeight: '600' },
      },
      tooltip: {
        formatter: function (this: {
          point: { name: string; y: number; percentage: number };
        }): string {
          return (
            '<b>' +
            this.point.name +
            '</b><br/>₹' +
            (this.point.y || 0).toLocaleString('en-IN') +
            ' (' +
            this.point.percentage.toFixed(1) +
            '%)'
          );
        },
      },
      plotOptions: {
        pie: {
          innerSize: '55%',
          dataLabels: {
            enabled: true,
            format: '{point.name}',
            style: { color: textColor, fontSize: '11px' },
          },
        },
      },
      series: [{ name: 'Spending', data: seriesData }],
      credits: { enabled: false },
      legend: { enabled: false },
    };
  }, [txs, textColor]);

  const monthlyOptions = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });

    const data = months.map((m) => {
      const ms = startOfMonth(m);
      const me = endOfMonth(m);
      return txs
        .filter((t) => {
          const d = new Date(t.date);
          return d >= ms && d <= me;
        })
        .reduce((s, t) => s + t.amount, 0);
    });

    return {
      chart: { type: 'column', backgroundColor: 'transparent', height: 280 },
      title: {
        text: 'Monthly Totals',
        style: { color: textColor, fontSize: '16px', fontWeight: '600' },
      },
      xAxis: {
        categories: months.map((m) => format(m, 'MMM yyyy')),
        labels: { style: { color: textColor } },
      },
      yAxis: {
        title: { text: null },
        labels: {
          formatter: function (this: Highcharts.AxisLabelsFormatterContextObject): string {
            return '₹' + ((this.value as number) / 1000).toFixed(0) + 'k';
          },
          style: { color: textColor },
        },
      },
      tooltip: {
        formatter: function (this: { x: string; y: number }): string {
          return '<b>' + this.x + '</b><br/>₹' + (this.y || 0).toLocaleString('en-IN');
        },
      },
      series: [{ name: 'Total Spent', data, color: '#8b5cf6', borderRadius: 4 }],
      credits: { enabled: false },
      legend: { enabled: false },
    };
  }, [txs, textColor]);

  return { stats, timelineOptions, categoryOptions, monthlyOptions };
}
