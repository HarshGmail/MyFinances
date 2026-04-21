'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StockFinancials, StocksPortfolioItem } from '@/api/dataInterface';
import MetricEducationDrawer from '@/app/stocks/detail/[symbol]/MetricEducationDrawer';
import { ANALYTICS_METRIC_DEFINITIONS } from './analyticsMetricDefinitions';

const KPI_METRIC_MAP: Record<string, string> = {
  'Avg Trailing P/E': 'Trailing P/E',
  'Portfolio Beta': 'Beta (5Y)',
  'Avg ROE': 'ROE',
  'Positive Earnings Growth': 'Earnings Growth',
  'Avg Net Margin': 'Net Margin',
};

interface Props {
  analyticsData: Record<string, StockFinancials>;
  portfolio: StocksPortfolioItem[];
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function PortfolioSummaryBar({ analyticsData, portfolio }: Props) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const entries = Object.entries(analyticsData);

  const peValues = entries
    .map(([, f]) => f.summaryDetail?.trailingPE)
    .filter((v): v is number => v != null && v > 0 && v < 200);

  const roeValues = entries
    .map(([, f]) => f.financialData?.returnOnEquity)
    .filter((v): v is number => v != null);

  const netMarginValues = entries
    .map(([, f]) => f.financialData?.profitMargins)
    .filter((v): v is number => v != null);

  const totalInvested = portfolio.reduce((s, p) => s + p.investedAmount, 0);
  const portfolioBeta =
    totalInvested > 0
      ? entries.reduce((s, [sym, f]) => {
          const beta = f.summaryDetail?.beta;
          const stock = portfolio.find((p) => p.stockName === sym);
          if (beta == null || !stock) return s;
          return s + beta * (stock.investedAmount / totalInvested);
        }, 0)
      : 0;

  const posEarningsGrowth = entries.filter(
    ([, f]) => (f.financialData?.earningsGrowth ?? -1) >= 0
  ).length;

  const kpis = [
    {
      label: 'Avg Trailing P/E',
      value: peValues.length ? avg(peValues).toFixed(1) : 'N/A',
      sub: `${peValues.length} of ${entries.length} stocks`,
    },
    {
      label: 'Portfolio Beta',
      value: portfolioBeta > 0 ? portfolioBeta.toFixed(2) : 'N/A',
      sub: 'Weighted by investment',
    },
    {
      label: 'Avg ROE',
      value: roeValues.length ? `${(avg(roeValues) * 100).toFixed(1)}%` : 'N/A',
      sub: 'Return on equity',
    },
    {
      label: 'Positive Earnings Growth',
      value: `${posEarningsGrowth}/${entries.length}`,
      sub: 'Stocks growing YoY',
    },
    {
      label: 'Avg Net Margin',
      value: netMarginValues.length ? `${(avg(netMarginValues) * 100).toFixed(1)}%` : 'N/A',
      sub: 'Profit as % of revenue',
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between mb-1">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                {KPI_METRIC_MAP[k.label] && (
                  <button
                    onClick={() => setSelectedMetric(KPI_METRIC_MAP[k.label])}
                    className="text-muted-foreground hover:text-foreground transition-colors ml-1 shrink-0"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="text-2xl font-bold">{k.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

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
