'use client';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StockFinancials } from '@/api/dataInterface';

interface Props {
  analyticsData: Record<string, StockFinancials>;
  theme: 'light' | 'dark';
}

export function ProfitabilitySection({ analyticsData, theme }: Props) {
  const textColor = theme === 'dark' ? '#fff' : '#18181b';
  const entries = Object.entries(analyticsData);

  const symbols = entries.map(([s]) => s);
  const roeData = entries.map(([, f]) =>
    parseFloat(((f.financialData?.returnOnEquity ?? 0) * 100).toFixed(1))
  );
  const opMarginData = entries.map(([, f]) =>
    parseFloat(((f.financialData?.operatingMargins ?? 0) * 100).toFixed(1))
  );
  const netMarginData = entries.map(([, f]) =>
    parseFloat(((f.financialData?.profitMargins ?? 0) * 100).toFixed(1))
  );

  const options: Highcharts.Options = {
    chart: {
      type: 'bar',
      backgroundColor: 'transparent',
      height: Math.max(280, entries.length * 60),
    },
    title: { text: undefined },
    xAxis: { categories: symbols, labels: { style: { color: textColor } } },
    yAxis: {
      title: { text: 'Percentage (%)', style: { color: textColor } },
      labels: { format: '{value}%', style: { color: textColor } },
    },
    tooltip: { valueSuffix: '%' },
    legend: { itemStyle: { color: textColor } },
    credits: { enabled: false },
    plotOptions: { bar: { grouping: true, borderRadius: 2 } },
    series: [
      { type: 'bar', name: 'ROE', data: roeData, color: '#3b82f6' },
      { type: 'bar', name: 'Operating Margin', data: opMarginData, color: '#8b5cf6' },
      { type: 'bar', name: 'Net Margin', data: netMarginData, color: '#22c55e' },
    ],
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profitability Analysis</CardTitle>
        <p className="text-sm text-muted-foreground">
          ROE, operating margin, and net margin per stock (%)
        </p>
      </CardHeader>
      <CardContent>
        <HighchartsReact highcharts={Highcharts} options={options} />
      </CardContent>
    </Card>
  );
}
