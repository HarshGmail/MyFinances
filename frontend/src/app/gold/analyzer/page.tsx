'use client';

import { useMemo } from 'react';
import { useSafeGoldRatesQuery } from '@/api/query';
import { Skeleton } from '@/components/ui/skeleton';
import { SummaryStatCard } from '@/components/custom/SummaryStatCard';
import { formatCurrency } from '@/utils/numbers';
import { computeGoldMarketMetrics, buildGoldMarketCards } from './goldMetrics';
import GoldMetricsGrid from './GoldMetricsGrid';
import GoldPriceChartAnalyzer from './GoldPriceChartAnalyzer';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export default function GoldAnalyzerPage() {
  const endDate = new Date().toISOString().slice(0, 10);
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const startDate = fiveYearsAgo.toISOString().slice(0, 10);

  const { data: ratesData, isLoading } = useSafeGoldRatesQuery({ startDate, endDate });

  const metrics = useMemo(() => {
    if (!ratesData?.data || ratesData.data.length === 0) {
      return null;
    }

    const priceData = ratesData.data.map((d) => ({
      date: d.date,
      price: parseFloat(d.rate),
    }));

    const firstDate = ratesData.data[ratesData.data.length - 1].date;
    return computeGoldMarketMetrics(priceData, firstDate);
  }, [ratesData]);

  const metricCards = useMemo(() => (metrics ? buildGoldMarketCards(metrics) : []), [metrics]);

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gold Market Analysis</h1>
        <p className="text-muted-foreground">
          Analyze gold price performance, trends, and market metrics
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : metrics ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryStatCard
              label="Current Price (₹/g)"
              value={formatCurrency(metrics.currentPrice)}
            />
            <SummaryStatCard label="52W High" value={formatCurrency(metrics.high52W || 0)} />
            <SummaryStatCard label="52W Low" value={formatCurrency(metrics.low52W || 0)} />
            <SummaryStatCard
              label={
                <div className="flex items-center gap-2">
                  Price Change (1D)
                  {metrics.priceChangePct1D !== null && metrics.priceChangePct1D >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                </div>
              }
              value={
                metrics.priceChangePct1D !== null ? (
                  <span
                    className={metrics.priceChangePct1D >= 0 ? 'text-green-600' : 'text-red-500'}
                  >
                    {(metrics.priceChangePct1D * 100).toFixed(2)}%
                  </span>
                ) : (
                  <span>—</span>
                )
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SummaryStatCard
              label="1M Change"
              value={
                metrics.priceChange1M !== null ? (
                  <span className={metrics.priceChange1M >= 0 ? 'text-green-600' : 'text-red-500'}>
                    {(metrics.priceChange1M * 100).toFixed(2)}%
                  </span>
                ) : (
                  <span>—</span>
                )
              }
            />
            <SummaryStatCard
              label="1Y Change"
              value={
                metrics.priceChange1Y !== null ? (
                  <span className={metrics.priceChange1Y >= 0 ? 'text-green-600' : 'text-red-500'}>
                    {(metrics.priceChange1Y * 100).toFixed(2)}%
                  </span>
                ) : (
                  <span>—</span>
                )
              }
            />
            <SummaryStatCard
              label="5Y Change"
              value={
                metrics.priceChange5Y !== null ? (
                  <span className={metrics.priceChange5Y >= 0 ? 'text-green-600' : 'text-red-500'}>
                    {(metrics.priceChange5Y * 100).toFixed(2)}%
                  </span>
                ) : (
                  <span>—</span>
                )
              }
            />
          </div>

          <GoldPriceChartAnalyzer ratesData={ratesData?.data || []} />

          <div>
            <h2 className="text-lg font-semibold mb-4">Market Metrics</h2>
            <GoldMetricsGrid cards={metricCards} isLoading={isLoading} />
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No gold price data available</p>
        </div>
      )}
    </div>
  );
}
