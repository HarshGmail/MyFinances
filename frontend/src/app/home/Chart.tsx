'use client';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import 'highcharts/highcharts-more';
import { useAppStore } from '@/store/useAppStore';

interface PolarChartProps {
  investedData: number[];
  currentValueData: number[];
  categories: string[];
}

export default function PolarChart({
  investedData,
  currentValueData,
  categories,
}: PolarChartProps) {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';

  const barOptions: Highcharts.Options = {
    chart: {
      type: 'column',
      backgroundColor: 'transparent',
      height: 400,
    },
    credits: {
      enabled: false,
    },
    title: {
      text: 'Portfolio Breakdown by Asset Class',
      style: { color: isDark ? '#fff' : '#8181b' },
    },
    xAxis: {
      categories,
      crosshair: true,
      labels: { style: { color: isDark ? '#fff' : '#8181b' } },
    },
    yAxis: {
      min: 0,
      title: {
        text: 'Amount (₹)',
        style: { color: isDark ? '#fff' : '#8181b' },
      },
      labels: {
        style: { color: isDark ? '#fff' : '#8181b' },
        formatter: function () {
          const value = this.value as number;
          if (value >= 100000) {
            return value / 100000 + ' lakh';
          }
          return value.toString();
        },
      },
      gridLineColor: isDark ? '#333' : '#e5e7eb',
    },
    tooltip: {
      shared: true,
      backgroundColor: isDark ? '#fff' : '#8181b',
      borderColor: isDark ? '#333' : '#e5e7eb',
      style: { color: isDark ? '#fff' : '#8181b', fontWeight: 'normal' },
      headerFormat: `<span style="font-size: 14px; color: ${isDark ? '#fff' : '#8181b'} font-weight: 600">{point.key}</span><table>`,
      pointFormat:
        `<tr><td style="color:{series.color};padding:0;font-weight:600">{series.name}: </td>` +
        `<td style="padding:0;color:${isDark ? '#fff' : '#8181b'}"><b>₹{point.y:,.0f}</b></td></tr>`,
      footerFormat: '</table>',
      useHTML: true,
    },
    legend: {
      itemStyle: { color: isDark ? '#fff' : '#8181b' },
    },
    plotOptions: {
      column: {
        pointPadding: 0.2,
        borderWidth: 0,
        borderRadius: 4,
        groupPadding: 0.1,
      },
    },
    series: [
      {
        name: 'Invested',
        data: investedData,
        type: 'column',
        color: '#38bdf8', // sky-400
      },
      {
        name: 'Current Value',
        data: currentValueData,
        type: 'column',
        color: '#6366f1', // indigo-500
      },
    ],
    responsive: {
      rules: [
        {
          condition: { maxWidth: 500 },
          chartOptions: {
            legend: {
              align: 'center',
              verticalAlign: 'bottom',
              layout: 'horizontal',
            },
          },
        },
      ],
    },
  };

  return <HighchartsReact highcharts={Highcharts} options={barOptions} />;
}
