'use client';

import { useParams, useRouter } from 'next/navigation';
import { useStockFinancialsQuery, useStocksPortfolioQuery } from '@/api/query/stocks';
import CompanySearchBar from './CompanySearchBar';
import CompanyHeader from './CompanyHeader';
import PriceChart from './PriceChart';
import SnapshotVerdict from './SnapshotVerdict';
import FundamentalsGrid from './FundamentalsGrid';
import StockNotFound from './StockNotFound';
import { Skeleton } from '@/components/ui/skeleton';

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = decodeURIComponent(params.symbol as string);

  const {
    data: financials,
    isLoading: isFinancialsLoading,
    error: financialsError,
  } = useStockFinancialsQuery(symbol);
  const { data: portfolioData } = useStocksPortfolioQuery();

  const portfolioStocks = portfolioData?.portfolio ?? [];
  const isInPortfolio = portfolioStocks.some(
    (s) => s.stockName === symbol || s.stockName === symbol.replace('.NS', '')
  );

  // Check if we've finished loading and have no data (stock not found)
  const hasNoData =
    !isFinancialsLoading &&
    financialsError &&
    (!financials || Object.values(financials).every((v) => !v));

  if (hasNoData) {
    return <StockNotFound symbol={symbol} />;
  }

  // Show skeleton while loading
  if (isFinancialsLoading && !financials) {
    return (
      <div className="p-4 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      <CompanySearchBar
        currentSymbol={symbol}
        portfolioStocks={portfolioStocks}
        onSelect={(sym) => router.push(`/stocks/detail/${encodeURIComponent(sym)}`)}
      />

      <CompanyHeader
        companyName={financials?.price?.shortName ?? financials?.price?.longName ?? symbol}
        symbol={symbol}
        isInPortfolio={isInPortfolio}
        currentPrice={financials?.price?.regularMarketPrice}
        change={financials?.price?.regularMarketChange}
        changePct={financials?.price?.regularMarketChangePercent}
        isLoading={isFinancialsLoading}
      />

      <PriceChart symbol={symbol} />

      <SnapshotVerdict financialData={financials?.financialData} financials={financials} />

      <FundamentalsGrid financials={financials} isLoading={isFinancialsLoading} />
    </div>
  );
}
