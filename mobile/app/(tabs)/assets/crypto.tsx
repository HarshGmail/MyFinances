import { useMemo } from 'react';
import {
  useCryptoTickerChangesQuery,
  useCryptoTransactionsQuery,
} from '@myfinances/core/api/query/crypto';
import {
  groupCryptoHoldings,
  heldCoinSymbols,
  valueCryptoHoldings,
} from '@myfinances/core/calc/cryptoHoldings';
import { holdingXirrPercent } from '@myfinances/core/calc/holdingXirr';
import { formatCurrency, formatSignedPercent } from '@myfinances/core/calc/numbers';
import { EmptyState, LoadingState, Row, Screen } from '@/components/ui';
import { HoldingCard, SignedText, SummaryCard } from '@/components/HoldingCard';

const COIN_DECIMALS = 6;

export default function CryptoScreen() {
  const transactionsQuery = useCryptoTransactionsQuery();
  const holdings = useMemo(
    () => groupCryptoHoldings(transactionsQuery.data ?? []),
    [transactionsQuery.data]
  );
  const coins = useMemo(() => heldCoinSymbols(holdings), [holdings]);
  const tickerQuery = useCryptoTickerChangesQuery(coins);

  const positions = useMemo(() => {
    const tickers = tickerQuery.data?.data;
    if (!tickers) return [];
    const prices = Object.fromEntries(coins.map((coin) => [coin, tickers[coin]?.price ?? null]));
    return valueCryptoHoldings(holdings, prices).sort((a, b) => b.currentValue - a.currentValue);
  }, [tickerQuery.data, coins, holdings]);

  const totals = useMemo(() => {
    const invested = positions.reduce((sum, p) => sum + p.investedAmount, 0);
    const currentValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
    const profitLoss = currentValue - invested;
    return {
      invested,
      currentValue,
      profitLoss,
      profitLossPercentage: invested > 0 ? (profitLoss / invested) * 100 : 0,
      xirr: holdingXirrPercent(transactionsQuery.data ?? [], currentValue),
    };
  }, [positions, transactionsQuery.data]);

  if (transactionsQuery.isLoading || (coins.length > 0 && tickerQuery.isLoading)) {
    return <LoadingState />;
  }

  return (
    <Screen
      underHeader
      refreshing={transactionsQuery.isFetching || tickerQuery.isFetching}
      onRefresh={() => {
        transactionsQuery.refetch();
        tickerQuery.refetch();
      }}
    >
      <SummaryCard
        label="Crypto value"
        value={totals.currentValue}
        profitLoss={totals.profitLoss}
        profitLossPercentage={totals.profitLossPercentage}
      >
        <Row label="Invested" value={formatCurrency(totals.invested)} />
        <Row label="XIRR" value={totals.xirr === null ? '—' : formatSignedPercent(totals.xirr)} />
      </SummaryCard>

      {positions.length ? (
        positions.map((position) => {
          const change24h = tickerQuery.data?.data[position.currency]?.changePct24h ?? 0;
          return (
            <HoldingCard
              key={position.currency}
              title={`${position.coinName} (${position.currency})`}
              currentValue={position.currentValue}
              profitLoss={position.profitLoss}
              profitLossPercentage={position.profitLossPercentage}
              metrics={[
                { label: 'Balance', value: position.balance.toFixed(COIN_DECIMALS) },
                { label: 'Price', value: formatCurrency(position.currentPrice) },
                { label: 'Invested', value: formatCurrency(position.investedAmount) },
                {
                  label: '24h',
                  value: (
                    <SignedText value={change24h}>{formatSignedPercent(change24h)}</SignedText>
                  ),
                },
              ]}
            />
          );
        })
      ) : (
        <EmptyState message="No crypto holdings yet." />
      )}
    </Screen>
  );
}
