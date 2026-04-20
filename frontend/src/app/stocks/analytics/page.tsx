'use client';

import { useMemo } from 'react';
import { usePortfolioAnalyticsQuery, useStocksPortfolioQuery } from '@/api/query/stocks';
import { useAppStore } from '@/store/useAppStore';
import { PortfolioSummaryBar } from './PortfolioSummaryBar';
import { ValuationSection } from './ValuationSection';
import { ProfitabilitySection } from './ProfitabilitySection';
import { GrowthSection } from './GrowthSection';
import { RiskSection } from './RiskSection';
import { StockScorecardTable } from './StockScorecardTable';
import { Skeleton } from '@/components/ui/skeleton';

export default function StocksAnalyticsPage() {
  const { theme } = useAppStore();
  const { data: portfolioData, isLoading: portfolioLoading } = useStocksPortfolioQuery();
  const { data: analyticsData, isLoading: analyticsLoading } = usePortfolioAnalyticsQuery();

  const portfolio = useMemo(() => portfolioData?.portfolio ?? [], [portfolioData]);
  const isLoading = portfolioLoading || analyticsLoading;

  const loadedCount = analyticsData ? Object.keys(analyticsData).length : 0;
  const totalCount = portfolio.length;

  if (isLoading) {
    return (
      <div className="p-4 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Portfolio Analytics</h1>
          <p className="text-muted-foreground text-sm">
            {loadedCount > 0
              ? `Loaded ${loadedCount} of ${totalCount} stocks…`
              : 'Fetching fundamental data for all holdings…'}
          </p>
          <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 rounded-full"
              style={{ width: totalCount > 0 ? `${(loadedCount / totalCount) * 100}%` : '15%' }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  if (!analyticsData || Object.keys(analyticsData).length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground mt-20">
        No stock holdings found. Add transactions to see portfolio analytics.
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Portfolio Analytics</h1>
        <p className="text-muted-foreground text-sm">
          Deep fundamental analysis across {Object.keys(analyticsData).length} holdings
        </p>
      </div>

      <PortfolioSummaryBar analyticsData={analyticsData} portfolio={portfolio} />
      <ValuationSection analyticsData={analyticsData} theme={theme} />
      <ProfitabilitySection analyticsData={analyticsData} theme={theme} />
      <GrowthSection analyticsData={analyticsData} theme={theme} />
      <RiskSection analyticsData={analyticsData} theme={theme} />
      <StockScorecardTable analyticsData={analyticsData} portfolio={portfolio} />
    </div>
  );
}
