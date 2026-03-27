'use client';

import { SummaryStatCard } from '@/components/custom/SummaryStatCard';
import { CapitalGainsSummary } from '@/components/custom/CapitalGainsSummary';
import { formatCurrency, formatToPercentage } from '@/utils/numbers';
import { getProfitLossColor } from '@/utils/text';
import { useCryptoPortfolioData } from './useCryptoPortfolioData';
import CryptoPerformanceChart from './CryptoPerformanceChart';
import CryptoPortfolioTable from './CryptoPortfolioTable';

export default function CryptoPortfolioPage() {
  const {
    transactions,
    cgData,
    cgLoading,
    portfolioData,
    cryptoUnrealized,
    cryptoUnrealizedByCoin,
    coinColorMap,
    summary,
    xirrValue,
    multipleCoinCandles,
    chartData,
    getCoinTransactions,
    timeframe,
    setTimeframe,
    selectedCoin,
    setSelectedCoin,
    selectedTimeframe,
    timeframeStart,
    chartRef,
    isLoading,
    isChartLoading,
    error,
  } = useCryptoPortfolioData();

  if (isLoading) {
    return (
      <div className="p-4 h-full">
        <div className="text-center">Loading portfolio data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 h-full">
        <div className="text-red-500 text-center">Error loading portfolio data</div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full">
      <h2 className="text-xl font-bold mb-6 text-center">Crypto Portfolio</h2>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <SummaryStatCard label="Total Invested" value={formatCurrency(summary.totalInvested)} />
          <SummaryStatCard
            label={
              <>
                {summary.totalProfitLoss >= 0 ? 'Current Profit' : 'Current Loss'}{' '}
                <span className={getProfitLossColor(summary.totalProfitLoss)}>
                  ({formatCurrency(summary.totalProfitLoss)})
                </span>
              </>
            }
            value={
              <span className={getProfitLossColor(summary.totalProfitLoss)}>
                {formatCurrency(summary.totalCurrentValue)}{' '}
                <span>({formatToPercentage(summary.totalProfitLossPercentage)}%)</span>
              </span>
            }
            valueClassName={getProfitLossColor(summary.totalProfitLoss)}
          />
          <SummaryStatCard
            label="XIRR %"
            value={xirrValue !== null ? `${xirrValue.toFixed(2)}%` : 'N/A'}
            valueClassName={
              xirrValue !== null && xirrValue >= 0 ? 'text-green-600' : 'text-red-600'
            }
          />
        </div>
      )}

      {portfolioData.length > 0 && (
        <CryptoPerformanceChart
          portfolioData={portfolioData}
          transactions={transactions}
          multipleCoinCandles={multipleCoinCandles}
          chartData={chartData}
          selectedCoin={selectedCoin}
          setSelectedCoin={setSelectedCoin}
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          selectedTimeframeDays={selectedTimeframe.days}
          timeframeStart={timeframeStart}
          isChartLoading={isChartLoading}
          chartRef={chartRef}
        />
      )}

      <CryptoPortfolioTable
        portfolioData={portfolioData}
        coinColorMap={coinColorMap}
        cryptoUnrealizedByCoin={cryptoUnrealizedByCoin}
        getCoinTransactions={getCoinTransactions}
        selectedCoin={selectedCoin}
        setSelectedCoin={setSelectedCoin}
        onScrollToChart={() =>
          chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      />

      <div className="mt-6">
        <CapitalGainsSummary
          realizedByFY={cgData?.byAsset?.crypto?.realizedByFY ?? {}}
          unrealized={cryptoUnrealized}
          assetType="crypto"
          currentFY={cgData?.summary?.currentFY ?? ''}
          isLoading={cgLoading}
        />
      </div>
    </div>
  );
}
