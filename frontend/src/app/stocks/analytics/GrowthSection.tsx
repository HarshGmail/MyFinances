'use client';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StockFinancials } from '@/api/dataInterface';

interface Props {
  analyticsData: Record<string, StockFinancials>;
  theme: 'light' | 'dark';
}

export function GrowthSection({ analyticsData, theme }: Props) {
  const textColor = theme === 'dark' ? '#fff' : '#18181b';
  const entries = Object.entries(analyticsData);

  const symbols = entries.map(([s]) => s);
  const revGrowth = entries.map(([, f]) => {
    const v = f.financialData?.revenueGrowth;
    return v != null ? parseFloat((v * 100).toFixed(1)) : null;
  });
  const epsGrowth = entries.map(([, f]) => {
    const v = f.financialData?.earningsGrowth;
    return v != null ? parseFloat((v * 100).toFixed(1)) : null;
  });

  const colorPoints = (data: (number | null)[]) =>
    data.map((v) => ({
      y: v,
      color: v == null ? '#6b7280' : v >= 0 ? '#22c55e' : '#ef4444',
    }));

  const options: Highcharts.Options = {
    chart: { type: 'column', backgroundColor: 'transparent', height: 320 },
    title: { text: undefined },
    xAxis: { categories: symbols, labels: { style: { color: textColor } } },
    yAxis: {
      title: { text: 'Growth YoY (%)', style: { color: textColor } },
      labels: { format: '{value}%', style: { color: textColor } },
      plotLines: [{ value: 0, color: '#6b7280', width: 1 }],
    },
    tooltip: {
      valueSuffix: '%',
      pointFormat:
        '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}%</b><br/>',
    },
    legend: { itemStyle: { color: textColor } },
    credits: { enabled: false },
    plotOptions: { column: { grouping: true, borderRadius: 2 } },
    series: [
      { type: 'column', name: 'Revenue Growth', data: colorPoints(revGrowth) },
      { type: 'column', name: 'Earnings Growth', data: colorPoints(epsGrowth), color: '#8b5cf6' },
    ],
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Growth Analysis</CardTitle>
        <p className="text-sm text-muted-foreground">
          Revenue and earnings growth year-over-year per stock. Green = positive, red = declining.
        </p>
      </CardHeader>
      <CardContent>
        <HighchartsReact highcharts={Highcharts} options={options} />
      </CardContent>
    </Card>
  );
}
