'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StockFinancials } from '@/api/dataInterface';
import MetricEducationDrawer from '@/app/stocks/detail/[symbol]/MetricEducationDrawer';
import { ANALYTICS_METRIC_DEFINITIONS } from './analyticsMetricDefinitions';

const PROFITABILITY_METRICS = [
  { label: 'ROE', metric: 'ROE', color: '#3b82f6' },
  { label: 'Operating Margin', metric: 'Operating Margin', color: '#8b5cf6' },
  { label: 'Net Margin', metric: 'Net Margin', color: '#22c55e' },
];

interface Props {
  analyticsData: Record<string, StockFinancials>;
  theme: 'light' | 'dark';
}

export function ProfitabilitySection({ analyticsData, theme }: Props) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
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
    tooltip: { valueSuffix: '%', shared: true },
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
    <>
      <Card>
        <CardHeader>
          <CardTitle>Profitability Analysis</CardTitle>
          <p className="text-sm text-muted-foreground">
            ROE, operating margin, and net margin per stock (%)
          </p>
          <div className="flex gap-2 flex-wrap mt-2">
            {PROFITABILITY_METRICS.map(({ label, metric, color }) => (
              <button
                key={label}
                onClick={() => setSelectedMetric(metric)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border hover:bg-muted/50 transition-colors"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                {label}
                <Info className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <HighchartsReact highcharts={Highcharts} options={options} />
        </CardContent>
      </Card>

      <MetricEducationDrawer
        isOpen={selectedMetric !== null}
        metricLabel={selectedMetric ?? ''}
        onClose={() => setSelectedMetric(null)}
        realData={null}
        definitions={ANALYTICS_METRIC_DEFINITIONS}
      />
    </>
  );
}
