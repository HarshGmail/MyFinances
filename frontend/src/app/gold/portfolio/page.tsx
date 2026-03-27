'use client';

import { SummaryStatCard } from '@/components/custom/SummaryStatCard';
import { CapitalGainsSummary } from '@/components/custom/CapitalGainsSummary';
import { formatCurrency } from '@/utils/numbers';
import { useGoldPortfolioData } from './useGoldPortfolioData';
import GoldPriceChart from './GoldPriceChart';
import GoldInvestmentChart from './GoldInvestmentChart';
import { StatsSkeleton, ChartSkeleton, InvestmentChartSkeleton } from './GoldPortfolioSkeletons';

export default function GoldPortfolioPage() {
  const {
    TIMEFRAMES,
    timeframe,
    setTimeframe,
    data,
    transactions,
    cgData,
    cgLoading,
    filteredRates,
    goldStats,
    goldUnrealized,
    transactionPlotLines,
    isLoading,
    error,
  } = useGoldPortfolioData();

  if (error) {
    return (
      <div className="p-4 h-full">
        <div className="text-red-500 text-center">Failed to load gold rates</div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full">
      <h2 className="text-2xl font-bold mb-6 text-center">Gold Portfolio</h2>

      {isLoading ? (
        <StatsSkeleton />
      ) : goldStats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <SummaryStatCard label="Total Gold (gms)" value={goldStats.totalGold.toFixed(4)} />
          <SummaryStatCard label="Total Invested" value={formatCurrency(goldStats.totalInvested)} />
          <SummaryStatCard
            label={
              <>
                Current Valuation{' '}
                <span className={goldStats.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                  ({formatCurrency(goldStats.profitLoss)})
                </span>
              </>
            }
            value={
              <span className={goldStats.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(goldStats.currentValue)}{' '}
                <span>({goldStats.profitLossPercentage.toFixed(2)}%)</span>
              </span>
            }
            valueClassName={goldStats.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}
          />
          <SummaryStatCard
            label="Avg vs Current Price"
            valueClassName="text-xl"
            value={
              <>
                <div>Avg: ₹{goldStats.avgPrice.toFixed(2)}</div>
                <div>Current: ₹{goldStats.currentPrice.toFixed(2)}</div>
              </>
            }
          />
          <SummaryStatCard
            label="XIRR %"
            value={goldStats.xirrValue !== null ? goldStats.xirrValue.toFixed(2) + '%' : 'N/A'}
            valueClassName={
              goldStats.xirrValue !== null && goldStats.xirrValue >= 0
                ? 'text-green-600'
                : 'text-red-600'
            }
          />
        </div>
      ) : null}

      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <GoldPriceChart
          filteredRates={filteredRates}
          transactionPlotLines={transactionPlotLines}
          goldStats={goldStats}
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          TIMEFRAMES={TIMEFRAMES}
        />
      )}

      {isLoading ? (
        <InvestmentChartSkeleton />
      ) : transactions?.length ? (
        <GoldInvestmentChart transactions={transactions} data={data} />
      ) : null}

      <div className="mt-6">
        <CapitalGainsSummary
          realizedByFY={cgData?.byAsset?.gold?.realizedByFY ?? {}}
          unrealized={goldUnrealized}
          assetType="gold"
          currentFY={cgData?.summary?.currentFY ?? ''}
          isLoading={cgLoading}
        />
      </div>
    </div>
  );
}
