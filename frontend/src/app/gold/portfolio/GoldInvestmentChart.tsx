import { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useAppStore } from '@/store/useAppStore';
import type { GoldTransaction, SafeGoldRatesResponse } from '@/api/dataInterface';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

type MonthGroup = {
  label: string;
  totalInvested: number;
  totalValuation: number;
  transactions: GoldTransaction[];
};

export default function GoldInvestmentChart({
  transactions,
  data,
}: {
  transactions: GoldTransaction[];
  data: SafeGoldRatesResponse | undefined;
}) {
  const { theme } = useAppStore();

  const chartOptions = useMemo(() => {
    if (!transactions?.length) return {};

    const currentGoldPrice = data?.data?.length
      ? parseFloat(data.data[data.data.length - 1].rate)
      : null;

    const monthMap = new Map<string, MonthGroup>();
    [...transactions]
      .filter((tx) => tx.type === 'credit')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach((tx) => {
        const d = new Date(tx.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = `${MONTH_NAMES[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
        if (!monthMap.has(key))
          monthMap.set(key, { label, totalInvested: 0, totalValuation: 0, transactions: [] });
        const g = monthMap.get(key)!;
        g.totalInvested += tx.amount;
        if (currentGoldPrice !== null) g.totalValuation += tx.quantity * currentGoldPrice;
        g.transactions.push(tx);
      });

    const months = Array.from(monthMap.values());
    if (!months.length) return {};

    const textColor = theme === 'dark' ? '#e5e7eb' : '#18181b';
    const gridColor = theme === 'dark' ? '#374151' : '#e5e7eb';

    return {
      chart: {
        type: 'column',
        backgroundColor: 'transparent',
        height: 440,
        style: { fontFamily: 'inherit' },
      },
      title: {
        text: 'Monthly Gold Investment',
        style: {
          fontWeight: 600,
          fontSize: '1.1rem',
          color: theme === 'dark' ? '#fff' : '#18181b',
        },
      },
      xAxis: {
        categories: months.map((m) => m.label),
        labels: {
          style: { color: textColor, fontSize: '11px' },
          rotation: 0,
          align: 'right' as const,
        },
        lineColor: gridColor,
        tickColor: gridColor,
      },
      yAxis: {
        title: { text: 'Amount (₹)', style: { color: textColor } },
        labels: {
          formatter: function (this: Highcharts.AxisLabelsFormatterContextObject): string {
            const v = this.value as number;
            return v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${v.toLocaleString('en-IN')}`;
          },
          style: { color: textColor },
        },
        min: 0,
        gridLineWidth: 0.5,
        gridLineColor: gridColor,
      },
      tooltip: {
        useHTML: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: function (this: any): string {
          const month: MonthGroup = months[this.point.index];
          const gain =
            currentGoldPrice !== null ? month.totalValuation - month.totalInvested : null;
          const gainPct =
            gain !== null && month.totalInvested > 0 ? (gain / month.totalInvested) * 100 : null;
          const gainColor = gain !== null && gain >= 0 ? '#4ade80' : '#f87171';

          let html = `<div style="padding:8px;min-width:210px;font-size:12px;">
            <div style="font-weight:700;font-size:13px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(128,128,128,0.3);">${month.label}</div>`;

          month.transactions.forEach((tx) => {
            const txVal = currentGoldPrice !== null ? tx.quantity * currentGoldPrice : null;
            const txGain = txVal !== null ? txVal - tx.amount : null;
            const txGainColor = txGain !== null && txGain >= 0 ? '#4ade80' : '#f87171';
            const d = new Date(tx.date);
            html += `<div style="margin-bottom:8px;padding:6px;background:rgba(128,128,128,0.1);border-radius:6px;">
              <div style="color:#94a3b8;font-size:11px;margin-bottom:3px;">${d.getDate()} ${MONTH_NAMES[d.getMonth()]} · ${tx.quantity.toFixed(4)}g</div>
              <div style="color:#93c5fd;">Invested: <b>₹${tx.amount.toLocaleString('en-IN')}</b></div>`;
            if (txVal !== null && txGain !== null) {
              html += `<div style="color:${txGainColor};">Now: <b>₹${Math.round(txVal).toLocaleString('en-IN')}</b> <span style="font-size:11px;">(${txGain >= 0 ? '+' : ''}${((txGain / tx.amount) * 100).toFixed(1)}%)</span></div>`;
            }
            html += `</div>`;
          });

          if (month.transactions.length > 1) {
            html += `<div style="padding-top:6px;border-top:1px solid rgba(128,128,128,0.3);font-weight:600;">
              <div style="color:#93c5fd;">Total invested: ₹${month.totalInvested.toLocaleString('en-IN')}</div>`;
            if (gain !== null && gainPct !== null) {
              html += `<div style="color:${gainColor};">Now: ₹${Math.round(month.totalValuation).toLocaleString('en-IN')} (${gain >= 0 ? '+' : ''}${gainPct.toFixed(1)}%)</div>`;
            }
            html += `</div>`;
          } else if (gain !== null && gainPct !== null) {
            html += `<div style="color:${gainColor};font-weight:600;">${gain >= 0 ? '+' : ''}${gainPct.toFixed(1)}% gain</div>`;
          }

          return html + `</div>`;
        },
      },
      plotOptions: {
        column: {
          grouping: true,
          pointPadding: 0.05,
          groupPadding: 0.15,
          borderWidth: 0,
          borderRadius: 4,
        },
      },
      series: [
        {
          type: 'column',
          name: 'Amount Invested',
          data: months.map((m) => m.totalInvested),
          color: {
            linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
            stops: [
              [0, '#60a5fa'],
              [1, '#2563eb'],
            ],
          },
        },
        ...(currentGoldPrice !== null
          ? [
              {
                type: 'column',
                name: 'Current Valuation',
                data: months.map((m) => m.totalValuation),
                color: {
                  linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
                  stops: [
                    [0, '#4ade80'],
                    [1, '#16a34a'],
                  ],
                },
              },
            ]
          : []),
      ],
      credits: { enabled: false },
      legend: {
        enabled: true,
        itemStyle: { color: textColor, fontWeight: 'normal', fontSize: '12px' },
        itemHoverStyle: { color: theme === 'dark' ? '#fff' : '#000' },
      },
    };
  }, [transactions, theme, data]);

  return (
    <div className="bg-card rounded-lg p-4 mt-6">
      <HighchartsReact
        highcharts={Highcharts}
        options={chartOptions}
        containerProps={{ style: { height: 420 } }}
      />
    </div>
  );
}
