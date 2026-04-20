'use client';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StockFinancials } from '@/api/dataInterface';

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

function buildColumnOptions(
  title: string,
  labels: string[],
  counts: number[],
  colors: string[],
  textColor: string
): Highcharts.Options {
  return {
    chart: { type: 'column', backgroundColor: 'transparent', height: 280 },
    title: { text: title, style: { color: textColor, fontSize: '14px', fontWeight: '600' } },
    xAxis: { categories: labels, labels: { style: { color: textColor } } },
    yAxis: {
      title: { text: 'Stocks', style: { color: textColor } },
      allowDecimals: false,
      labels: { style: { color: textColor } },
    },
    tooltip: { pointFormat: '<b>{point.y} stock(s)</b>' },
    legend: { enabled: false },
    credits: { enabled: false },
    series: [
      {
        type: 'column',
        name: 'Stocks',
        data: counts.map((c, i) => ({ y: c, color: colors[i] })),
        borderRadius: 4,
      },
    ],
    plotOptions: { column: { dataLabels: { enabled: true, style: { color: textColor } } } },
  };
}

export function ValuationSection({ analyticsData, theme }: Props) {
  const textColor = theme === 'dark' ? '#fff' : '#18181b';
  const entries = Object.values(analyticsData);

  const peBucketMap: Record<string, number> = {
    'Value (<15)': 0,
    'Fair (15–25)': 0,
    'Moderate (25–35)': 0,
    'Expensive (>35)': 0,
    'N/A': 0,
  };
  const pbBucketMap: Record<string, number> = {
    'Below Book (<1)': 0,
    'Reasonable (1–3)': 0,
    'Premium (>3)': 0,
    'N/A': 0,
  };

  for (const f of entries) {
    const pe = f.summaryDetail?.trailingPE;
    const pb = f.defaultKeyStatistics?.priceToBook;
    peBucketMap[bucket(pe, PE_BUCKETS)]++;
    pbBucketMap[bucket(pb, PB_BUCKETS)]++;
  }

  const peColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280'];
  const pbColors = ['#22c55e', '#3b82f6', '#f59e0b', '#6b7280'];

  const peLabels = Object.keys(peBucketMap);
  const pbLabels = Object.keys(pbBucketMap);

  const peOptions = buildColumnOptions(
    'P/E Ratio Distribution',
    peLabels,
    Object.values(peBucketMap),
    peColors,
    textColor
  );
  const pbOptions = buildColumnOptions(
    'P/B Ratio Distribution',
    pbLabels,
    Object.values(pbBucketMap),
    pbColors,
    textColor
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Valuation Analysis</CardTitle>
        <p className="text-sm text-muted-foreground">
          How your holdings are priced relative to earnings and book value
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HighchartsReact highcharts={Highcharts} options={peOptions} />
          <HighchartsReact highcharts={Highcharts} options={pbOptions} />
        </div>
      </CardContent>
    </Card>
  );
}
