'use client';

import { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useAppStore } from '@/store/useAppStore';
import { formatSignedCurrency, formatSignedPercent } from '@myfinances/core/calc/numbers';

export interface ChangeBar {
  label: string;
  change: number;
  changePct: number;
}

const GAIN_COLOR = '#16a34a';
const LOSS_COLOR = '#dc2626';
const BAR_HEIGHT_PX = 44;
const CHART_PADDING_PX = 60;
const LABEL_MAX_WIDTH_PX = 180;

export default function ChangeBarChart({ bars }: { bars: ChangeBar[] }) {
  const theme = useAppStore((state) => state.theme);

  const options = useMemo<Highcharts.Options>(() => {
    const textColor = theme === 'dark' ? '#fff' : '#18181b';
    const mutedColor = theme === 'dark' ? '#a1a1aa' : '#71717a';
    const gridColor = theme === 'dark' ? '#3f3f46' : '#e4e4e7';
    const sorted = [...bars].sort((a, b) => b.change - a.change);

    return {
      chart: {
        type: 'bar',
        backgroundColor: 'transparent',
        height: sorted.length * BAR_HEIGHT_PX + CHART_PADDING_PX,
      },
      title: { text: undefined },
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: {
        categories: sorted.map((bar) => bar.label),
        labels: {
          style: {
            color: textColor,
            fontSize: '12px',
            width: LABEL_MAX_WIDTH_PX,
            textOverflow: 'ellipsis',
          },
        },
        lineWidth: 0,
      },
      yAxis: {
        title: { text: undefined },
        gridLineColor: gridColor,
        labels: {
          style: { color: mutedColor },
          formatter() {
            return formatSignedCurrency(Number(this.value)).replace(/\.\d+$/, '');
          },
        },
        plotLines: [{ value: 0, color: mutedColor, width: 1, zIndex: 3 }],
      },
      tooltip: {
        formatter() {
          const bar = sorted[this.index];
          return `<b>${bar.label}</b><br/>${formatSignedCurrency(bar.change)} (${formatSignedPercent(
            bar.changePct
          )})`;
        },
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          borderWidth: 0,
          pointPadding: 0.15,
          groupPadding: 0.1,
          dataLabels: {
            enabled: true,
            style: { color: textColor, textOutline: 'none', fontWeight: '500' },
            formatter() {
              return formatSignedCurrency(Number(this.y));
            },
          },
        },
      },
      series: [
        {
          type: 'bar',
          name: 'Change',
          data: sorted.map((bar) => ({
            y: Number(bar.change.toFixed(2)),
            color: bar.change >= 0 ? GAIN_COLOR : LOSS_COLOR,
          })),
        },
      ],
    };
  }, [bars, theme]);

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}
