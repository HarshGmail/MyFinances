'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StockFinancials } from '@/api/dataInterface';
import MetricEducationDrawer from '@/app/stocks/detail/[symbol]/MetricEducationDrawer';
import { ANALYTICS_METRIC_DEFINITIONS } from './analyticsMetricDefinitions';

const GROWTH_METRICS = [
  { label: 'Revenue Growth', metric: 'Revenue Growth' },
  { label: 'Earnings Growth', metric: 'Earnings Growth' },
];

interface Props {
  analyticsData: Record<string, StockFinancials>;
  theme: 'light' | 'dark';
}

export function GrowthSection({ analyticsData, theme }: Props) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
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
      shared: true,
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
    <>
      <Card>
        <CardHeader>
          <CardTitle>Growth Analysis</CardTitle>
          <p className="text-sm text-muted-foreground">
            Revenue and earnings growth year-over-year per stock. Green = positive, red = declining.
          </p>
          <div className="flex gap-2 flex-wrap mt-2">
            {GROWTH_METRICS.map(({ label, metric }) => (
              <button
                key={label}
                onClick={() => setSelectedMetric(metric)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border hover:bg-muted/50 transition-colors"
              >
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
