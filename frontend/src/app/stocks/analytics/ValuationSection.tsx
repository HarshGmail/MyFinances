'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StockFinancials } from '@/api/dataInterface';
import MetricEducationDrawer from '@/app/stocks/detail/[symbol]/MetricEducationDrawer';
import { ANALYTICS_METRIC_DEFINITIONS } from './analyticsMetricDefinitions';

interface Props {
  analyticsData: Record<string, StockFinancials>;
  theme: 'light' | 'dark';
}

const PE_BUCKETS = [
  { label: 'Value (<15)', max: 15 },
  { label: 'Fair (15–25)', min: 15, max: 25 },
  { label: 'Moderate (25–35)', min: 25, max: 35 },
  { label: 'Expensive (>35)', min: 35 },
];

const PB_BUCKETS = [
  { label: 'Below Book (<1)', max: 1 },
  { label: 'Reasonable (1–3)', min: 1, max: 3 },
  { label: 'Premium (>3)', min: 3 },
];

function bucket(
  val: number | undefined | null,
  buckets: { label: string; min?: number; max?: number }[]
): string {
  if (val == null || val <= 0) return 'N/A';
  for (const b of buckets) {
    const lo = b.min ?? -Infinity;
    const hi = b.max ?? Infinity;
    if (val >= lo && val < hi) return b.label;
  }
  return 'N/A';
}

type BucketEntry = { companies: { name: string; value: number | null }[] };

function buildColumnOptions(
  labels: string[],
  buckets: BucketEntry[],
  colors: string[],
  textColor: string
): Highcharts.Options {
  return {
    chart: { type: 'column', backgroundColor: 'transparent', height: 260 },
    title: { text: undefined },
    xAxis: { categories: labels, labels: { style: { color: textColor } } },
    yAxis: {
      title: { text: 'Stocks', style: { color: textColor } },
      allowDecimals: false,
      labels: { style: { color: textColor } },
    },
    tooltip: {
      useHTML: true,
      formatter: function (this: any) {
        const companies = (this.point?.custom as BucketEntry | undefined)?.companies ?? [];
        if (!companies.length) return `<b>${this.x}</b><br/>No stocks`;
        const rows = companies
          .sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity))
          .map(
            (c) =>
              `<tr><td style="padding-right:8px;color:${textColor}">${c.name}</td><td style="text-align:right;color:#94a3b8">${c.value != null ? c.value.toFixed(2) : 'N/A'}</td></tr>`
          )
          .join('');
        return `<span style="color:${textColor}"><b>${this.x}</b> — ${companies.length} stock(s)</span><br/><table style="margin-top:4px;border-spacing:0">${rows}</table>`;
      },
    },
    legend: { enabled: false },
    credits: { enabled: false },
    series: [
      {
        type: 'column',
        name: 'Stocks',
        data: buckets.map((b, i) => ({ y: b.companies.length, color: colors[i], custom: b })),
        borderRadius: 4,
      },
    ],
    plotOptions: { column: { dataLabels: { enabled: true, style: { color: textColor } } } },
  };
}

export function ValuationSection({ analyticsData, theme }: Props) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const textColor = theme === 'dark' ? '#fff' : '#18181b';

  const peBucketMap: Record<string, BucketEntry> = {
    'Value (<15)': { companies: [] },
    'Fair (15–25)': { companies: [] },
    'Moderate (25–35)': { companies: [] },
    'Expensive (>35)': { companies: [] },
    'N/A': { companies: [] },
  };
  const pbBucketMap: Record<string, BucketEntry> = {
    'Below Book (<1)': { companies: [] },
    'Reasonable (1–3)': { companies: [] },
    'Premium (>3)': { companies: [] },
    'N/A': { companies: [] },
  };

  for (const [sym, f] of Object.entries(analyticsData)) {
    const pe = f.summaryDetail?.trailingPE;
    const pb = f.defaultKeyStatistics?.priceToBook;
    peBucketMap[bucket(pe, PE_BUCKETS)].companies.push({ name: sym, value: pe ?? null });
    pbBucketMap[bucket(pb, PB_BUCKETS)].companies.push({ name: sym, value: pb ?? null });
  }

  const peColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280'];
  const pbColors = ['#22c55e', '#3b82f6', '#f59e0b', '#6b7280'];

  const peLabels = Object.keys(peBucketMap);
  const pbLabels = Object.keys(pbBucketMap);

  const peOptions = buildColumnOptions(peLabels, Object.values(peBucketMap), peColors, textColor);
  const pbOptions = buildColumnOptions(pbLabels, Object.values(pbBucketMap), pbColors, textColor);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Valuation Analysis</CardTitle>
          <p className="text-sm text-muted-foreground">
            How your holdings are priced relative to earnings and book value
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold">P/E Ratio Distribution</span>
                <button
                  onClick={() => setSelectedMetric('Trailing P/E')}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>
              <HighchartsReact highcharts={Highcharts} options={peOptions} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold">P/B Ratio Distribution</span>
                <button
                  onClick={() => setSelectedMetric('Price / Book')}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>
              <HighchartsReact highcharts={Highcharts} options={pbOptions} />
            </div>
          </div>
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
