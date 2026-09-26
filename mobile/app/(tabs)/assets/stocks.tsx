import { useMemo } from 'react';
import { Text } from 'react-native';
import { useStocksPortfolioQuery } from '@myfinances/core/api/query/stocks';
import { holdingXirrPercent } from '@myfinances/core/calc/holdingXirr';
import {
  formatCurrency,
  formatSignedCurrency,
  formatSignedPercent,
} from '@myfinances/core/calc/numbers';
import { STOCK_REFRESH_MS_OPEN, getNseMarketStatus } from '@myfinances/core/calc/marketHours';
import { EmptyState, LoadingState, Row, Screen } from '@/components/ui';
import { HoldingCard, SignedText, SummaryCard } from '@/components/HoldingCard';
import { changeClass } from '@/lib/theme';

function formatXirr(value: number | null) {
  return value === null ? '—' : formatSignedPercent(value);
}

export default function StocksScreen() {
  const isMarketOpen = getNseMarketStatus() === 'open';
  const { data, isLoading, isFetching, refetch } = useStocksPortfolioQuery(false, {
    refetchInterval: isMarketOpen ? STOCK_REFRESH_MS_OPEN : undefined,
  });

  const holdings = useMemo(
    () =>
      (data?.portfolio ?? [])
        .filter((stock) => stock.numOfShares > 0)
        .sort((a, b) => b.currentValuation - a.currentValuation),
    [data?.portfolio]
  );

  const xirrByStock = useMemo(() => {
    const transactions = data?.transactions ?? [];
    return new Map(
      holdings.map((stock) => [
        stock.stockName,
        holdingXirrPercent(
          transactions.filter((tx) => tx.stockName === stock.stockName),
          stock.currentValuation
        ),
      ])
    );
  }, [data?.transactions, holdings]);

  const overallXirr = useMemo(
    () => holdingXirrPercent(data?.transactions ?? [], data?.summary.totalCurrentValue ?? 0),
    [data?.transactions, data?.summary.totalCurrentValue]
  );

  if (isLoading || !data) return <LoadingState />;
  const { summary } = data;

  return (
    <Screen underHeader refreshing={isFetching} onRefresh={refetch}>
      <SummaryCard
        label="Portfolio value"
        value={summary.totalCurrentValue}
        profitLoss={summary.totalProfitLoss}
        profitLossPercentage={summary.totalProfitLossPercentage}
      >
        <Row label="Invested" value={formatCurrency(summary.totalInvested)} />
        <Row
          label="1 day change"
          value={
            <Text className={`text-sm font-medium ${changeClass(summary.totalOneDayChange)}`}>
              {formatSignedCurrency(summary.totalOneDayChange)} (
              {formatSignedPercent(summary.totalOneDayChangePercentage)})
            </Text>
          }
        />
        <Row label="XIRR" value={formatXirr(overallXirr)} />
      </SummaryCard>

      {holdings.length ? (
        holdings.map((stock) => (
          <HoldingCard
            key={stock.stockName}
            title={stock.stockName}
            currentValue={stock.isDataAvailable ? stock.currentValuation : null}
            profitLoss={stock.profitLoss}
            profitLossPercentage={stock.profitLossPercentage}
            metrics={[
              { label: 'Shares', value: String(stock.numOfShares) },
              { label: 'Avg price', value: formatCurrency(stock.avgPrice) },
              { label: 'Price', value: formatCurrency(stock.currentPrice) },
              { label: 'Invested', value: formatCurrency(stock.investedAmount) },
              {
                label: 'Day',
                value: (
                  <SignedText value={stock.oneDayChange}>
                    {formatSignedCurrency(stock.oneDayChange)}
                  </SignedText>
                ),
              },
              { label: 'XIRR', value: formatXirr(xirrByStock.get(stock.stockName) ?? null) },
            ]}
          />
        ))
      ) : (
        <EmptyState message="No stock holdings yet." />
      )}
    </Screen>
  );
}
