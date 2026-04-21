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

type BucketEntry = { companies: { name: string; value: number | null }[] };

function buildDonut(
  data: { name: string; color: string; custom: BucketEntry }[],
  textColor: string
): Highcharts.Options {
  return {
    chart: { type: 'pie', backgroundColor: 'transparent', height: 240 },
    title: { text: undefined },
    tooltip: {
      useHTML: true,
      formatter: function (this: any) {
        const companies = (this.point?.custom as BucketEntry | undefined)?.companies ?? [];
        const pct = ((this.point?.percentage as number) ?? 0).toFixed(0);
        if (!companies.length)
          return `<span style="color:${textColor}"><b>${this.point.name}</b><br/>No stocks</span>`;
        const rows = companies
          .sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity))
          .map(
            (c) =>
              `<tr><td style="padding-right:8px;color:${textColor}">${c.name}</td><td style="text-align:right;color:#94a3b8">${c.value != null ? c.value.toFixed(2) : 'N/A'}</td></tr>`
          )
          .join('');
        return `<span style="color:${textColor}"><b>${this.point.name}</b> — ${companies.length} stock(s) (${pct}%)</span><br/><table style="margin-top:4px;border-spacing:0">${rows}</table>`;
      },
    },
    plotOptions: {
      pie: {
        innerSize: '55%',
        dataLabels: {
          enabled: true,
          format: '{point.name}: {point.y}',
          style: { color: textColor, fontSize: '11px' },
        },
      },
    },
    legend: { enabled: false },
    credits: { enabled: false },
    series: [
      {
        type: 'pie',
        name: 'Stocks',
        data: data.map((d) => ({ ...d, y: d.custom.companies.length })),
      },
    ],
  };
}

export function RiskSection({ analyticsData, theme }: Props) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const textColor = theme === 'dark' ? '#fff' : '#18181b';
  const entries = Object.entries(analyticsData);

  const betaBuckets: Record<string, BucketEntry> = {
    'Defensive (<0.8)': { companies: [] },
    'Market (0.8–1.2)': { companies: [] },
    'Aggressive (>1.2)': { companies: [] },
    'N/A': { companies: [] },
  };
  const deBuckets: Record<string, BucketEntry> = {
    'Low (<0.5)': { companies: [] },
    'Moderate (0.5–1.5)': { companies: [] },
    'High (>1.5)': { companies: [] },
    'N/A': { companies: [] },
  };
  const riskFlags: { symbol: string; reason: string }[] = [];

  for (const [sym, f] of entries) {
    const beta = f.summaryDetail?.beta;
    const de = f.financialData?.debtToEquity;

    if (beta == null) betaBuckets['N/A'].companies.push({ name: sym, value: null });
    else if (beta < 0.8) betaBuckets['Defensive (<0.8)'].companies.push({ name: sym, value: beta });
    else if (beta < 1.2) betaBuckets['Market (0.8–1.2)'].companies.push({ name: sym, value: beta });
    else betaBuckets['Aggressive (>1.2)'].companies.push({ name: sym, value: beta });

    if (de == null) deBuckets['N/A'].companies.push({ name: sym, value: null });
    else if (de < 50) deBuckets['Low (<0.5)'].companies.push({ name: sym, value: de / 100 });
    else if (de < 150)
      deBuckets['Moderate (0.5–1.5)'].companies.push({ name: sym, value: de / 100 });
    else deBuckets['High (>1.5)'].companies.push({ name: sym, value: de / 100 });

    if (beta != null && beta > 1.5)
      riskFlags.push({ symbol: sym, reason: `High beta (${beta.toFixed(2)})` });
    if (de != null && de > 200)
      riskFlags.push({ symbol: sym, reason: `Very high D/E (${(de / 100).toFixed(2)})` });
  }

  const betaColors = ['#3b82f6', '#22c55e', '#f59e0b', '#6b7280'];
  const deColors = ['#22c55e', '#f59e0b', '#ef4444', '#6b7280'];

  const betaData = Object.entries(betaBuckets).map(([name, bucket], i) => ({
    name,
    color: betaColors[i],
    custom: bucket,
  }));
  const deData = Object.entries(deBuckets).map(([name, bucket], i) => ({
    name,
    color: deColors[i],
    custom: bucket,
  }));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Risk Profile</CardTitle>
          <p className="text-sm text-muted-foreground">
            Volatility (Beta) and leverage (Debt/Equity) distribution across your portfolio
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold">Beta Distribution</span>
                <button
                  onClick={() => setSelectedMetric('Beta (5Y)')}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>
              <HighchartsReact highcharts={Highcharts} options={buildDonut(betaData, textColor)} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold">Debt/Equity Distribution</span>
                <button
                  onClick={() => setSelectedMetric('Debt / Equity')}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>
              <HighchartsReact highcharts={Highcharts} options={buildDonut(deData, textColor)} />
            </div>
          </div>
          {riskFlags.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm font-semibold text-red-500 mb-2">Risk Flags</p>
              <ul className="space-y-1">
                {riskFlags.map((f, i) => (
                  <li key={i} className="text-sm text-red-400">
                    <span className="font-medium">{f.symbol}</span> — {f.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
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
