import { useMemo } from 'react';
import { format, parseISO, subMonths } from 'date-fns';
import Highcharts from 'highcharts';
import type {
  CardTransactionKind,
  CreditCard,
  CreditCardTransaction,
} from '@myfinances/core/types';
import {
  groupEmiPlans,
  isCostOfCredit,
  summariseCardSpend,
} from '@myfinances/core/calc/creditCards';
import {
  COST_OF_CREDIT_KINDS,
  cardTransactionKindLabel,
} from '@myfinances/core/schemas/creditCards';
import { formatCurrency } from '@myfinances/core/calc/numbers';
import { cardDisplayName } from './cardDisplay';

const MONTHS_SHOWN = 12;
const MONTH_KEY_FORMAT = 'yyyy-MM';
const CHART_HEIGHT = 300;
const CARD_COLORS = ['#3B82F6', '#F97316', '#8B5CF6', '#14B8A6', '#EC4899', '#EAB308', '#22C55E'];
const FALLBACK_COST_COLOR = '#94A3B8';
const COST_OF_CREDIT_COLORS: Partial<Record<CardTransactionKind, string>> = {
  emi_interest: '#F97316',
  tax: '#EF4444',
  fee: '#8B5CF6',
  interest: '#EAB308',
};

interface UseCreditCardsDataParams {
  cards: CreditCard[];
  transactions: CreditCardTransaction[];
  theme: string;
}

function recentMonthKeys(count: number, now: Date = new Date()): string[] {
  return Array.from({ length: count }, (_, index) =>
    format(subMonths(now, count - 1 - index), MONTH_KEY_FORMAT)
  );
}

function monthLabel(monthKey: string): string {
  return format(parseISO(`${monthKey}-01`), 'MMM yy');
}

function compactRupeeAxisLabel(this: Highcharts.AxisLabelsFormatterContextObject): string {
  return '₹' + ((this.value as number) / 1000).toFixed(0) + 'k';
}

function rupeePointFormatter(this: Highcharts.Point): string {
  return `<span style="color:${this.color}">●</span> ${this.series.name}: <b>${formatCurrency(this.y ?? 0)}</b><br/>`;
}

function slicePointFormatter(this: Highcharts.Point): string {
  return `<b>${formatCurrency(this.y ?? 0)}</b> (${(this.percentage ?? 0).toFixed(1)}%)`;
}

export function useCreditCardsData({ cards, transactions, theme }: UseCreditCardsDataParams) {
  const textColor = theme === 'dark' ? '#fff' : '#18181b';

  const summary = useMemo(() => summariseCardSpend(transactions), [transactions]);
  const emiPlans = useMemo(() => groupEmiPlans(transactions), [transactions]);
  const monthKeys = useMemo(() => recentMonthKeys(MONTHS_SHOWN), []);

  const baseOptions = useMemo(
    () => ({
      credits: { enabled: false },
      legend: { itemStyle: { color: textColor, fontWeight: '500' } },
      tooltip: { pointFormatter: rupeePointFormatter },
    }),
    [textColor]
  );

  const monthlySpendOptions = useMemo<Highcharts.Options>(() => {
    const spendByMonth = new Map(summary.months.map((month) => [month.monthKey, month.byCard]));
    const cardsWithSpend = cards.filter((card) =>
      monthKeys.some((key) => (spendByMonth.get(key)?.[card._id] ?? 0) > 0)
    );

    return {
      ...baseOptions,
      chart: { type: 'column', backgroundColor: 'transparent', height: CHART_HEIGHT },
      title: {
        text: 'Monthly Card Spend',
        style: { color: textColor, fontSize: '16px', fontWeight: '600' },
      },
      xAxis: { categories: monthKeys.map(monthLabel), labels: { style: { color: textColor } } },
      yAxis: {
        title: { text: undefined },
        labels: { formatter: compactRupeeAxisLabel, style: { color: textColor } },
      },
      tooltip: { shared: true, pointFormatter: rupeePointFormatter },
      plotOptions: { column: { stacking: 'normal', borderWidth: 0, borderRadius: 3 } },
      series: cardsWithSpend.map((card) => ({
        type: 'column' as const,
        name: cardDisplayName(card),
        color: CARD_COLORS[cards.indexOf(card) % CARD_COLORS.length],
        data: monthKeys.map((key) => spendByMonth.get(key)?.[card._id] ?? 0),
      })),
    };
  }, [baseOptions, cards, monthKeys, summary.months, textColor]);

  const categoryOptions = useMemo<Highcharts.Options>(() => {
    const slices = Object.entries(summary.byCategory)
      .filter(([, amount]) => amount > 0)
      .map(([name, y]) => ({ name, y }))
      .sort((a, b) => b.y - a.y);

    return {
      ...baseOptions,
      chart: { type: 'pie', backgroundColor: 'transparent', height: CHART_HEIGHT },
      title: {
        text: 'Spend by Category',
        style: { color: textColor, fontSize: '16px', fontWeight: '600' },
      },
      tooltip: { pointFormatter: slicePointFormatter },
      plotOptions: {
        pie: {
          innerSize: '55%',
          borderWidth: 0,
          dataLabels: {
            enabled: true,
            format: '{point.name}',
            style: { color: textColor, fontSize: '11px', textOutline: 'none' },
          },
        },
      },
      legend: { enabled: false },
      series: [{ type: 'pie', name: 'Spend', data: slices }],
    };
  }, [baseOptions, summary.byCategory, textColor]);

  const costOfCreditOptions = useMemo<Highcharts.Options>(() => {
    const amountsByKind = new Map<CardTransactionKind, Map<string, number>>();
    for (const tx of transactions.filter(isCostOfCredit)) {
      const monthKey = format(parseISO(tx.date), MONTH_KEY_FORMAT);
      const byMonth = amountsByKind.get(tx.kind) ?? new Map<string, number>();
      byMonth.set(monthKey, (byMonth.get(monthKey) ?? 0) + tx.amount);
      amountsByKind.set(tx.kind, byMonth);
    }

    return {
      ...baseOptions,
      chart: { type: 'column', backgroundColor: 'transparent', height: CHART_HEIGHT },
      title: {
        text: 'Cost of Credit',
        style: { color: textColor, fontSize: '16px', fontWeight: '600' },
      },
      subtitle: {
        text: 'Interest, GST and fees charged each month',
        style: { color: textColor, opacity: 0.7 },
      },
      xAxis: { categories: monthKeys.map(monthLabel), labels: { style: { color: textColor } } },
      yAxis: {
        title: { text: undefined },
        labels: { formatter: compactRupeeAxisLabel, style: { color: textColor } },
      },
      tooltip: { shared: true, pointFormatter: rupeePointFormatter },
      plotOptions: { column: { stacking: 'normal', borderWidth: 0, borderRadius: 3 } },
      series: COST_OF_CREDIT_KINDS.filter((kind) => amountsByKind.has(kind)).map((kind) => ({
        type: 'column' as const,
        name: cardTransactionKindLabel(kind),
        color: COST_OF_CREDIT_COLORS[kind] ?? FALLBACK_COST_COLOR,
        data: monthKeys.map((key) => amountsByKind.get(kind)?.get(key) ?? 0),
      })),
    };
  }, [baseOptions, monthKeys, textColor, transactions]);

  return {
    summary,
    emiPlans,
    monthlySpendOptions,
    categoryOptions,
    costOfCreditOptions,
  };
}
